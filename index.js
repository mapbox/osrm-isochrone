var isolines = require('turf-isolines'),
    grid = require('turf-grid'),
    destination = require('turf-destination'),
    point = require('turf-point'),
    distance = require('turf-distance'),
    extent = require('turf-extent'),
    featureCollection = require('turf-featurecollection'),
    polylineDecode = require('polyline').decode,
    OSRM = require('osrm');

module.exports = function (center, time, resolution, maxspeed, unit, network, done) {
    this.draw = function(destinations) {
        return isolines(destinations, 'eta', resolution, [time]);
    };
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
        var i = 0;
        var routedNum = 0;

        getNext(i);

        function getNext(i){
            if(destinations.features.length > targets.features.length){
                return;
            }
            if(i < targets.features.length) {
                var query = {
                    coordinates: [
                        [
                          center[1], center[0]
                        ],
                        [
                          targets.features[i].geometry.coordinates[1], targets.features[i].geometry.coordinates[0]
                        ]
                    ],
                    alternateRoute: false,
                    printInstructions: false
                };
            
                osrm.route(query, function(err, res){
                    i++;
                    if(err) console.log(err);
                    if(err) return done(err);
                    else if (!res || !res.route_summary) {
                        destinations.features.push({
                            type: 'Feature',
                            properties: {
                                eta: time+100
                                //,dist: 500
                            },
                            geometry: {
                                type: 'Point',
                                coordinates: [query.coordinates[1][1], query.coordinates[1][0]]
                            }
                        });
                    } else {
                        var distanceMapped = 0;
                        if (res.via_points) {
                            distanceMapped = distance(
                                point(query.coordinates[1][1], query.coordinates[1][0]),
                                point(res.via_points[1][1], res.via_points[1][0]),
                                unit
                            );
                        }
                        if (distanceMapped && distanceMapped < sizeCellGrid) {
                            destinations.features.push({
                                type: 'Feature',
                                properties: {
                                    eta: res.route_summary.total_time,
                                    dist: res.route_summary.total_distance
                                },
                                geometry: {
                                    type: 'Point',
                                    coordinates: [res.via_points[1][1], res.via_points[1][0]]
                                }
                            });
                        }
                        else {
                            // exclude some points from grid for isoline
                            if (!distanceMapped) distanceMapped = sizeCellGrid * 2;
                            destinations.features.push({
                                type: 'Feature',
                                properties: {
                                    // this point cannot be routed => a penality 2 is applied to maxspeed
                                    eta: time + (distanceMapped - sizeCellGrid) / (maxspeed / 3600) * 2
                                },
                                geometry: {
                                    type: 'Point',
                                    coordinates: [query.coordinates[1][1], query.coordinates[1][0]]
                                }
                            });
                        }
                    }
                    getNext(i);
                });
            } else {
                var result = self.draw(destinations);
                return done(null, result);
            }
        }
    };
    var self = this;

    // in case module is called directly
    if (this.process && this.process.title == 'node')
        return getIsochrone();
}
