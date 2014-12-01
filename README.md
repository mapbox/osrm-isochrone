osrm-isochrone
---

Generate drivetime [isochrones](http://en.wikipedia.org/wiki/Isochrone_map) from [OpenStreetMap](http://www.openstreetmap.org/) data using [OSRM](http://project-osrm.org/).

![](https://dl.dropbox.com/s/r7hntimgiv5cfeq/Screenshot%202014-11-24%2017.20.32.png?dl=0)


##Install

```sh
npm install osrm-isochrone
```

##Build
An osrm file is required for routing. This can be generated using included binaries. (*Note: this will take a lot of processing power if you are planning to use the entire planet.osm file. More info [here](https://github.com/Project-OSRM/osrm-backend/wiki/Running-OSRM)*)

```sh
#first download an osm file containing the area you need
./node_modules/osrm-isochrone/osrm/lib/binding/osrm-extract mydata.osm -p ./node_modules/osrm-isochrone/osrm/test/data/car.lua
./node_modules/osrm-isochrone/osrm/lib/binding/osrm-prepare mydata.osm -p ./node_modules/osrm-isochrone/osrm/test/data/car.lua
```
