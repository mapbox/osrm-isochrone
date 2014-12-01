var isolines = require('turf-isolines'),
    grid = require('turf-grid'),
    destination = require('turf-destination'),
    point = require('turf-point'),
    extent = require('turf-extent'),
    featureCollection = require('turf-featurecollection'),
    polylineDecode = require('polyline').decode,
    OSRM = require('osrm');

module.exports = function (center, time, resolution, network, done) {
    var osrm = new OSRM(network);
    // compute bbox
    // bbox should go out 1.4 miles in each direction for each minute
    // this will account for a driver going a bit above the max safe speed
    var centerPt = point(center[0], center[1]);
    var spokes = featureCollection([])
    var miles = (time/60) * 1.1;
    spokes.features.push(destination(centerPt, miles, 180, 'miles'));
    spokes.features.push(destination(centerPt, miles, 0, 'miles'));
    spokes.features.push(destination(centerPt, miles, 90, 'miles'));
    spokes.features.push(destination(centerPt, miles, -90, 'miles'));
    var bbox = extent(spokes);

    //compute destination grid
    var targets = grid(bbox, resolution);
    var routes = featureCollection([]);
    var destinations = featureCollection([]);
    var i = 0;
    var routedNum = 0;

    getNext(i);

    function getNext(i){
        if(destinations.length >= targets.length){
            return
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
                ]
            };
        
            osrm.route(query, function(err, res){
                i++;
                if(err) console.log(err)
                if(err) return done(err)
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
                    routes.features.push(decode(res));
                }
                getNext(i);
            });
        } else {
            var line = isolines(destinations, 'eta', resolution, [time]);
            return done(null, line);
        }
    }
}

function decode (res) {
    var route = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: polylineDecode(res.route_geometry)
        },
        properties: {
            eta: res.route_summary.total_time,
            dist: res.route_summary.total_distance
        }
    };
    route.geometry.coordinates = route.geometry.coordinates.map(function(c){
        var lon = c[1] * 0.1;
        var lat = c[0] * 0.1;
        return [lon, lat];
    });
    return route;
}