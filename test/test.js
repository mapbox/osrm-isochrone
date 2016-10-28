var test = require('tape'),
    area = require('geojson-area')
    isochrone = require('../');

test('osrm-isochrone', function(t) {
    var options = {
      resolution: 25, // sample resolution
      maxspeed: 70, // in 'unit'/hour
      unit: 'miles', // 'miles' or 'kilometers'
      network: 'test/data/berlin-latest.osrm' // prebuild dc osrm network file
    }
    var center = [13.388860,52.517037]; // center point
    var time = 300; // 300 second drivetime (5 minutes)

    t.plan(2);

    isochrone(center, time, options, function(err, drivetime) {
      t.error(err, "Could not compute isochrone");
      t.ok(drivetime);
    });
});
