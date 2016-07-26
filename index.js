var isolines = require('turf-isolines'),
    grid = require('turf-grid'),
    destination = require('turf-destination'),
    point = require('turf-point'),
    distance = require('turf-distance'),
    extent = require('turf-extent'),
    featureCollection = require('turf-featurecollection'),
    polylineDecode = require('polyline').decode,
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
            console.log(destinations);
            return isolines(destinations, 'eta', options.resolution, [time]);
        };
    }
    this.getIsochrone = function() {
        var osrm = options.network instanceof OSRM ? options.network : new OSRM(options.network);
        // compute bbox
        // bbox should go out 1.4 miles in each direction for each minute
        // this will account for a driver going a bit above the max safe speed
        var centerPt = point(center[0], center[1]);
        var spokes = featureCollection([]);
        var length = (time/3600) * options.maxspeed;
        spokes.features.push(destination(centerPt, length, 180, unit));
        spokes.features.push(destination(centerPt, length, 0, unit));
        spokes.features.push(destination(centerPt, length, 90, unit));
        spokes.features.push(destination(centerPt, length, -90, unit));
        var bbox = this.bbox = extent(spokes);
        var sizeCellGrid = this.sizeCellGrid = distance(point(bbox[0], bbox[1]), point(bbox[0], bbox[3]), unit) / options.resolution;

        //compute destination grid
        var targets = grid(bbox, options.resolution);
        targets.features = targets.features.filter(function(feat) {
            return distance(point(feat.geometry.coordinates[0], feat.geometry.coordinates[1]), centerPt, unit) <= length;
        });
        var destinations = featureCollection([]);

        var coord = targets.features.map(function(feat) {
            return [feat.geometry.coordinates[0], feat.geometry.coordinates[1]]
        });
        coord.push([center[0], center[1]]);
        console.log(coord);
        var sources = coord.length - 1;
        console.log(sources);
        osrm.table({
                coordinates: coord,
                sources: [sources]
            }, function(err, res) {
                if (err) {
                    console.log(err);
                    return done(err);
                }
                console.log(res.durations);
                if (res.durations &&
                    res.durations[0] && res.destinations &&
                    res.durations[0].length == res.destinations.length) {

                    res.durations[0].forEach(function(time, idx) {
                        var distanceMapped = distance(
                            point(coord[idx][1], coord[idx][0]),
                            point(res.destinations[idx][1], res.destinations[idx][0]),
                            unit
                        );
                        if (distanceMapped < sizeCellGrid) {
                            destinations.features.push({
                                type: 'Feature',
                                properties: {
                                    eta: time / 10
                                },
                                geometry: {
                                    type: 'Point',
                                    coordinates: [res.destinations[idx][1], res.destinations[idx][0]]
                                }
                            });
                        }
                        // specific for isoline algorithm: exclude some points from grid
                        else {
                            destinations.features.push({
                                type: 'Feature',
                                properties: {
                                    // this point cannot be routed => a penality 2 is applied to maxspeed
                                    eta: time + (distanceMapped - sizeCellGrid) / (options.maxspeed / 3600) * 2
                                },
                                geometry: {
                                    type: 'Point',
                                    coordinates: [coord[idx][1], coord[idx][0]]
                                }
                            });
                        }
                    });
                }
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
