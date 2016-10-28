var isolines = require('@turf/isolines'),
    grid = require('@turf/point-grid'),
    bbox = require('@turf/bbox'),
    destination = require('@turf/destination'),
    point = require('@turf/helpers').point,
    distance = require('@turf/distance'),
    featureCollection = require('@turf/helpers').featureCollection,
    OSRM = require('osrm');

module.exports = function (center, time, options, done) {
    if (!options) throw 'options is mandatory';
    if (!options.resolution) throw 'resolution is mandatory in options';
    if (!options.network) throw 'network is mandatory in options';
    if (!options.maxspeed) throw 'maxspeed is mandatory in options';
    var unit = options.unit || 'miles';
    if (options && options.draw) {
        this.draw = options.draw;
    } else {
        this.draw = function(destinations) {
            return isolines(destinations, 'eta', options.resolution, [time]);
        };
    }
    this.getIsochrone = function() {
        var osrm = options.network instanceof OSRM ? options.network : new OSRM(options.network);
        // compute bboxGrid
        // bboxGrid should go out 1.4 miles in each direction for each minute
        // this will account for a driver going a bit above the max safe speed
        var centerPt = point(center);
        var spokes = featureCollection([]);
        var length = (time/3600) * options.maxspeed;
        spokes.features.push(destination(centerPt, length, 180, unit));
        spokes.features.push(destination(centerPt, length, 0, unit));
        spokes.features.push(destination(centerPt, length, 90, unit));
        spokes.features.push(destination(centerPt, length, -90, unit));
        var bboxGrid = this.bboxGrid = bbox(spokes);
        var sizeCellGrid = this.sizeCellGrid = distance(point([bboxGrid[0], bboxGrid[1]]), point([bboxGrid[0], bboxGrid[3]]), unit) / options.resolution;

        //compute destination grid
        var targets = grid(bboxGrid, sizeCellGrid, unit);
        targets.features = targets.features.filter(function(feat) {
            return distance(point(feat.geometry.coordinates), centerPt, unit) <= length;
        });
        var destinations = featureCollection([]);

        var coord = targets.features.map(function(feat) {
            return feat.geometry.coordinates;
        });
        coord.push(center);
        var sources = coord.length - 1;

        var tableOptions = {
          coordinates: coord,
          sources: [sources]
        }

        osrm.table(tableOptions, function(err, res) {
            if (err) {
                console.log(err);
                return done(err);
            }
            res.durations[0].forEach(function(time, idx) {
                var distanceMapped = distance(
                    point(coord[idx]),
                    point(res.destinations[idx].location),
                    unit
                );
                if (distanceMapped < sizeCellGrid) {
                    var dest = point(res.destinations[idx].location);
                        dest.properties = {};
                        dest.properties.eta = time;
                        destinations.features.push(dest);
                }
            });
            var result = self.draw(destinations);
            return done(null, result);
            }
        );
    };
    var self = this;

    // in case module is called directly
    if (this.process && this.process.title == 'node')
        return getIsochrone();
}
