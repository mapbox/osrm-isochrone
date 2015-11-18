var isolines = require('turf-isolines'),
    grid = require('turf-grid'),
    destination = require('turf-destination'),
    point = require('turf-point'),
    distance = require('turf-distance'),
    extent = require('turf-extent'),
    featureCollection = require('turf-featurecollection'),
    polylineDecode = require('polyline').decode,
    OSRM = require('osrm');

module.exports = function (center, time, resolution, maxspeed, unit, network, done, options) {
    if (options && options.draw) {
        this.draw = options.draw;
    } else {
        this.draw = function(destinations) {
            return isolines(destinations, 'eta', resolution, [time]);
        };
    }
    this.getIsochrone = function() {
        var osrm = network instanceof OSRM ? network : new OSRM(network);
        // compute bbox
        // bbox should go out 1.4 miles in each direction for each minute
        // this will account for a driver going a bit above the max safe speed
        var centerPt = point(center[0], center[1]);
        var spokes = featureCollection([]);
        var length = (time/3600) * maxspeed;
        spokes.features.push(destination(centerPt, length, 180, unit));
        spokes.features.push(destination(centerPt, length, 0, unit));
        spokes.features.push(destination(centerPt, length, 90, unit));
        spokes.features.push(destination(centerPt, length, -90, unit));
        var bbox = this.bbox = extent(spokes);
        var sizeCellGrid = this.sizeCellGrid = distance(point(bbox[0], bbox[1]), point(bbox[0], bbox[3]), unit) / resolution;

        //compute destination grid
        var targets = grid(bbox, resolution);
        targets.features = targets.features.filter(function(feat) {
            return distance(point(feat.geometry.coordinates[0], feat.geometry.coordinates[1]), centerPt, unit) <= length;
        });
        var destinations = featureCollection([]);

        var coord = targets.features.map(function(feat) {
            return [feat.geometry.coordinates[1], feat.geometry.coordinates[0]]
        });
        osrm.table({
                coordinates: coord,
                sources: [[center[1], center[0]]],
                mappedPoints: true
            }, function(err, res) {
                if (err) {
                    console.log(err);
                    return done(err);
                }
                if (res.distance_table &&
                    res.distance_table[0] && res.target_mapped_coordinates &&
                    res.distance_table[0].length == res.target_mapped_coordinates.length) {

                    res.distance_table[0].forEach(function(time, idx) {
                        var distanceMapped = distance(
                            point(coord[idx][1], coord[idx][0]),
                            point(res.target_mapped_coordinates[idx][1], res.target_mapped_coordinates[idx][0]),
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
                                    coordinates: [res.target_mapped_coordinates[idx][1], res.target_mapped_coordinates[idx][0]]
                                }
                            });
                        }
                        // specific for isoline algorithm: exclude some points from grid
                        else {
                            destinations.features.push({
                                type: 'Feature',
                                properties: {
                                    // this point cannot be routed => a penality 2 is applied to maxspeed
                                    eta: time + (distanceMapped - sizeCellGrid) / (maxspeed / 3600) * 2
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
