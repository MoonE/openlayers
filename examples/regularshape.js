import Feature from '../src/ol/Feature.js';
import Map from '../src/ol/Map.js';
import Point from '../src/ol/geom/Point.js';
import VectorLayer from '../src/ol/layer/Vector.js';
import VectorSource from '../src/ol/source/Vector.js';
import View from '../src/ol/View.js';

const styles = {
  'square': {
    'shape-fill-color': ['var', 'color'],
    'shape-stroke-width': 2,
    'shape-stroke-color': 'black',
    'shape-points': 4,
    'shape-radius': 10,
    'shape-angle': Math.PI / 4,
  },
  'rectangle': {
    'shape-fill-color': 'red',
    'shape-stroke-width': 2,
    'shape-stroke-color': 'black',
    'shape-radius': 10 / Math.SQRT2,
    'shape-radius2': 10,
    'shape-points': 4,
    'shape-angle': 0,
    'shape-scale': [1, 0.5],
  },
  'triangle': {
    'shape-fill-color': 'red',
    'shape-stroke-width': 2,
    'shape-stroke-color': 'black',
    'shape-points': 3,
    'shape-radius': 10,
    'shape-rotation': Math.PI / 4,
    'shape-angle': 0,
  },
  'star': {
    'shape-fill-color': 'red',
    'shape-stroke-width': 2,
    'shape-stroke-color': 'black',
    'shape-points': 5,
    'shape-radius': 10,
    'shape-radius2': 4,
    'shape-rotation': 4,
    'shape-angle': 0,
  },
  'cross': {
    'shape-fill-color': 'red',
    'shape-stroke-width': 2,
    'shape-stroke-color': 'black',
    'shape-points': 4,
    'shape-radius': 10,
    'shape-radius2': 0,
    'shape-rotation': 0,
    'shape-angle': 0,
  },
  'x': {
    'shape-fill-color': 'red',
    'shape-stroke-width': 2,
    'shape-stroke-color': 'black',
    'shape-points': 4,
    'shape-radius': 10,
    'shape-radius2': 0,
    'shape-rotation': 0,
    'shape-angle': Math.PI / 4,
  },
  'stacked': [
    {
      'shape-fill-color': 'red',
      'shape-stroke-width': 2,
      'shape-stroke-color': 'black',
      'shape-points': 4,
      'shape-radius': 5,
      'shape-angle': Math.PI / 4,
      'shape-displacement': [0, 10],
    },
    {
      'shape-fill-color': 'red',
      'shape-stroke-width': 2,
      'shape-stroke-color': 'black',
      'shape-points': 4,
      'shape-radius': 10,
      'shape-angle': Math.PI / 4,
    },
  ],
};

const styleKeys = Object.keys(styles);
const count = 5000;
const features = new Array(count);
const e = 4500000;
for (let i = 0; i < count; ++i) {
  const coordinates = [2 * e * Math.random() - e, 2 * e * Math.random() - e];
  const styleIndex = Math.floor(Math.random() * (i % styleKeys.length));
  features[i] = new Feature(new Point(coordinates));
  features[i].set('shape', styleKeys[styleIndex], true);
}

const styleVariables = {
  color: 'red',
};

const vectorLayer = new VectorLayer({
  source: new VectorSource({
    features: features,
  }),
  variables: styleVariables,
  style: styleKeys.map((key, index) => {
    const rule = {
      filter: ['==', ['get', 'shape'], key],
      style: styles[key],
    };
    if (index > 0) {
      rule.else = true;
    }
    return rule;
  }),
});

const map = new Map({
  layers: [vectorLayer],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});

const colors = ['blue', 'green', 'yellow', 'aqua', 'red'];
let currentColor = 0;

document.getElementById('color-changer').addEventListener('click', function () {
  styleVariables.color = colors[currentColor++ % colors.length];
  vectorLayer.changed();
});
