var isolines = require('turf-isolines'),
    grid = require('turf-grid'),
    destination = require('turf-destination'),
    point = require('turf-point'),
    extent = require('turf-extent'),
    featureCollection = require('turf-featurecollection'),
    osrm = require('osrm');

module.exports = function (center, time, resolution, done) {
    // compute bbox
    // bbox should go out 1.4 miles in each direction for each minute
    // this will account for a driver going a bit above the max safe speed
    var centerPt = point(center[0], center[1]);
    var spokes = featureCollection([])
    var miles = time * 1.4;
    spokes.features.push(destination(centerPt, miles, 180, 'miles'));
    spokes.features.push(destination(centerPt, miles, -180, 'miles'));
    spokes.features.push(destination(centerPt, miles, 90, 'miles'));
    spokes.features.push(destination(centerPt, miles, -90, 'miles'));
    var bbox = extent(spokes)

    //compute destination grid
    var grid = T.grid(bbox, 30);
    var routes = featureCollection([]);
    var destinations = featureCollection([]);
    var i = 0;

    getNext(i)

    function getNext(i){
      if(i < grid.features.length) {
        var query = {
          coordinates: [
            [
              center[1], center[0]
            ],
            [
              grid.features[i].geometry.coordinates[1], grid.features[i].geometry.coordinates[0]
            ]
          ]
        };
        osrm.route(query, function(err, res){
          if(err) console.log(err)
          else if (!res || !res.route_summary.total_time || !res.route_summary.total_time) {
            console.log('RES missing data: ', res)
          } else {
            console.log(res.route_summary.total_time)
            destinations.features.push({
              type: 'Feature',
              properties: {
                eta: res.route_summary.total_time,
                dist: res.route_summary.total_distance
              },
              geometry:{
                type: 'Point',
                coordinates: [res.via_points[1][1], res.via_points[1][0]]
              }
            })
            routes.features.push(decode(res));
          }
          i++
          getNext(i);
        })
      } else {
        var line = isolines(destinations, 'eta', 50, [time]);
        done(null, line);
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