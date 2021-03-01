import Feature from '../src/ol/Feature.js';
import Map from '../src/ol/Map.js';
import Point from '../src/ol/geom/Point.js';
import View from '../src/ol/View.js';
import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Style,
  Text,
} from '../src/ol/style.js';
import {Cluster, OSM, Vector as VectorSource} from '../src/ol/source.js';
import {Polygon} from '../src/ol/geom.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';
import {defaults as defaultInteractions} from '../src/ol/interaction.js';

const distance = document.getElementById('distance');
const distanceInfo = document.getElementById('distance-info');
const factor = document.getElementById('factor');
const factorInfo = document.getElementById('factor-info');
const randomize = document.getElementById('randomize');
const numClusters = document.getElementById('num-clusters');

const count = 20000;
const features = new Array(count);
const e = 4500000;
for (let i = 0; i < count; ++i) {
  const coordinates = [2 * e * Math.random() - e, 2 * e * Math.random() - e];
  features[i] = new Feature(new Point(coordinates));
}

const source = new VectorSource({
  features: features,
});

distanceInfo.innerText = distance.value;
factorInfo.innerText = parseInt(factor.value, 10) / 100;
const clusterSource = new Cluster({
  distance: parseInt(distance.value, 10),
  source: source,
  factor: parseInt(factor.value, 10) / 100,
  randomize: randomize.checked,
});
clusterSource.on('change', function (evt) {
  numClusters.innerText = evt.target.features.length;
});
let hoverFeature = null;

const circle = new CircleStyle({
  radius: 1,
  fill: new Fill({
    color: 'red',
  }),
});

function createRectStyle(geometry, opts) {
  return new Style({
    geometry: geometry,
    stroke:
      opts.order !== undefined
        ? new Stroke({
            width: 2,
            color:
              'rgb(' +
              [255 * opts.order, 255 * opts.order, 255 * opts.order].join(',') +
              ')',
          })
        : undefined,
    fill: opts.fill
      ? new Fill({
          color: 'rgba(0, 0, 0, ' + opts.fill + ')',
        })
      : undefined,
  });
}
const styleCache = {};
const textFill = new Fill({color: '#fff'});
const markerFill = new Fill({color: '#3399CC'});
const markerStroke = new Stroke({color: '#fff'});

const clusters = new VectorLayer({
  source: clusterSource,
  style: function (feature) {
    if (feature.get('hidden')) {
      return null;
    }
    const size = feature.get('features').length;
    let style = styleCache[size];
    if (!style) {
      style = new Style({
        image: new CircleStyle({
          radius: 10,
          stroke: markerStroke,
          fill: markerFill,
        }),
        text: new Text({
          text: size.toString(),
          fill: textFill,
        }),
      });
      styleCache[size] = style;
    }
    const meta = feature.get('meta');
    if (feature === hoverFeature) {
      if (!meta.subStyle) {
        const rectFill = createRectStyle(meta.searchRect, {fill: 0.25});
        const rectStroke = createRectStyle(meta.searchRect, {
          order: meta.order,
        });
        rectStroke.setZIndex(50);
        meta.subStyle = feature.get('features').map(function (feature) {
          return new Style({
            geometry: feature.getGeometry(),
            image: circle,
            zIndex: 100,
          });
        });
        style = style.clone();
        style.setZIndex(10);
        meta.subStyle.unshift(rectFill, style, rectStroke);
      }
      return meta.subStyle;
    }
    if (!meta.rectStyle) {
      meta.rectStyle = [
        createRectStyle(meta.searchRect, {order: meta.order, fill: 0.01}),
        style,
      ];
    }
    return meta.rectStyle;
  },
});

const raster = new TileLayer({
  source: new OSM(),
});

const map = new Map({
  interactions: defaultInteractions({
    doubleClickZoom: false,
  }),
  layers: [
    raster,
    new VectorLayer({
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new Polygon([
              [
                [e, e],
                [e, -e],
                [-e, -e],
                [-e, e],
                [e, e],
              ],
            ]),
          }),
        ],
      }),
      style: new Style({
        fill: new Fill({
          color: 'rgba(0, 255, 0, .2)',
        }),
      }),
    }),
    clusters,
  ],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});

map.on('click', function (evt) {
  map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    feature.set('hidden', true);
    map.once('postrender', function () {
      onPointerMove(evt);
    });
    return true;
  });
});
function onPointerMove(evt) {
  hoverFeature = null;
  const newHoverFeature = map.forEachFeatureAtPixel(evt.pixel, function (
    feature
  ) {
    return feature;
  });
  if (newHoverFeature !== hoverFeature) {
    hoverFeature = newHoverFeature;
    clusters.changed();
  }
}
map.on('pointermove', onPointerMove);

let distKey;
distance.addEventListener('input', function () {
  distanceInfo.innerText = distance.value;
  if (!distKey) {
    distKey = map.once('precompose', function () {
      distKey = undefined;
      clusterSource.setDistance(parseInt(distance.value, 10));
    });
    map.render();
  }
});

let factorKey;
factor.addEventListener('input', function () {
  factorInfo.innerText = factor.value;
  if (!factorKey) {
    factorKey = map.once('precompose', function () {
      factorKey = undefined;
      const val = parseInt(factor.value, 10) / 100;
      clusterSource.updateFactor(val);
    });
    map.render();
  }
});
randomize.addEventListener('change', function () {
  clusterSource.setRandomize(randomize.checked);
});
