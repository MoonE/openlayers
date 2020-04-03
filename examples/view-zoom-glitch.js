import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import TileLayer from '../src/ol/layer/Tile.js';
import OSM from '../src/ol/source/OSM.js';
import ZoomSlider from '../src/ol/control/ZoomSlider.js';
import {defaults as defaultControls} from '../src/ol/control.js';
import {fromLonLat} from '../src/ol/proj.js';

const topLeft = [10, 40];
const bottomRight = [20, 46];
const map1 = new Map({
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  controls: defaultControls().extend([new ZoomSlider()]),
  target: 'map1',
  view: new View({
    center: [0, 0],
    zoom: 2,
    maxZoom: 1,
    minZoom: 0
  })
});
document.querySelector('.one.max-zoom').innerText = map1.getView().getMaxZoom();

const map2 = new Map({
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  controls: defaultControls().extend([new ZoomSlider()]),
  target: 'map2',
  view: new View({
    center: [0, 0],
    zoom: 2,
    smoothExtentConstraint: false,
    extent: [].concat(fromLonLat(topLeft), fromLonLat(bottomRight)),
    maxZoom: 1,
    minZoom: 0
  })
});
document.querySelector('.two.max-zoom').innerText = map2.getView().getMaxZoom();
document.querySelector('.two.extent').innerText =
  JSON.stringify(topLeft) + ', ' + JSON.stringify(bottomRight);
