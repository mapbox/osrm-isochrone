var test = require('tape'),
    area = require('geojson-area')
    isochrone = require('../');

test('osrm-isochrone', function(t) {
    var resolution = 35;
    var time = 5;
    var network = '../dc.osrm'
    var locations = [
        [-77.02926635742188,38.90011780426885]
    ];

    locations.forEach(function(location) {
        isochrone(location, time, resolution, network, function(err, drivetime) {
            if(err) throw err;
            t.ok(drivetime);
            console.log(JSON.stringify(drivetime))
            t.end()
        });
    });
});