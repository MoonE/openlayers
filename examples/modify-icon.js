import Feature from '../src/ol/Feature.js';
import Map from '../src/ol/Map.js';
import Point from '../src/ol/geom/Point.js';
import TileJSON from '../src/ol/source/TileJSON.js';
import VectorSource from '../src/ol/source/Vector.js';
import View from '../src/ol/View.js';
import {Fill, Icon, Stroke, Style} from '../src/ol/style.js';
import {LineString, Polygon} from '../src/ol/geom.js';
import {Modify} from '../src/ol/interaction.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';

const iconFeature = new Feature({
  geometry: new Point([0, 0]),
  name: 'Null Island',
  population: 4000,
  rainfall: 500,
});

const iconStyle = new Style({
  image: new Icon({
    anchor: [0.5, 46],
    anchorXUnits: 'fraction',
    anchorYUnits: 'pixels',
    src: 'data/icon.png',
  }),
});
iconFeature.setStyle(iconStyle);

const lineFeature = new Feature(
  new LineString([
    [1000000, 700000],
    [0, 0],
    [500000, 0],
    [0, 0],
    [1000000, -700000],
  ])
);
lineFeature.setStyle(
  new Style({
    stroke: new Stroke({
      color: 'green',
      width: 6,
    }),
  })
);
const lineFeature2 = new Feature(
  new LineString([
    [1000000, 500000],
    [0, 0],
    [500000, 0],
    [0, 0],
    [1000000, -500000],
  ])
);
lineFeature2.setStyle(
  new Style({
    stroke: new Stroke({
      color: 'orange',
      width: 5,
    }),
  })
);
const polygonFeature = new Feature(
  new Polygon([
    [
      [1000000, 500000],
      [500000, 0],
      [0, 0],
      [1000000, -500000],
      [1000000, 500000],
    ],
  ])
);
polygonFeature.setStyle(
  new Style({
    fill: new Fill({
      color: 'rgba(200, 0, 0, .3)',
    }),
    stroke: new Stroke({
      color: 'red',
      width: 5,
    }),
  })
);

const vectorSource = new VectorSource({
  features: [lineFeature, lineFeature2, polygonFeature, iconFeature],
});

const vectorLayer = new VectorLayer({
  source: vectorSource,
});

const rasterLayer = new TileLayer({
  source: new TileJSON({
    url: 'https://a.tiles.mapbox.com/v3/aj.1x1-degrees.json?secure=1',
    crossOrigin: '',
  }),
});

const target = document.getElementById('map');
const map = new Map({
  layers: [rasterLayer, vectorLayer],
  target: target,
  view: new View({
    center: [0, 0],
    zoom: 3,
  }),
});

const modify = new Modify({
  hitDetection: vectorLayer,
  source: vectorSource,
});
modify.on(['modifystart', 'modifyend'], function (evt) {
  target.style.cursor = evt.type === 'modifystart' ? 'grabbing' : 'pointer';
});
const overlaySource = modify.getOverlay().getSource();
overlaySource.on(['addfeature', 'removefeature'], function (evt) {
  target.style.cursor = evt.type === 'addfeature' ? 'pointer' : '';
});

map.addInteraction(modify);
