var test = require('tape'),
    area = require('geojson-area')
    isochrone = require('./');

test('osrm-isochrone', function(t) {
    t.plan(7);
    var resolution = 10;
    var time 1000;
    var locations = [
        [-75.16416549682616,39.94804262581411],
        [-73.95506858825684,40.714411227628915],
        [-73.20877075195312,44.461475576425855],
        [-84.51503276824951,39.09856077249074],
        [-84.38907623291016,33.761880986766215],
        [-80.20706176757812,25.784435164398015],
        [-118.3612060546875,33.98436372829188]
    ];

    locations.forEach(function(location){
        var drivetime = isochrone(location);
        t.ok(drivetime);
    });
});