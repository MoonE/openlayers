import GeoJSON from '../src/ol/format/GeoJSON.js';
import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Style,
  Text,
} from '../src/ol/style.js';
import {OSM, Vector as VectorSource} from '../src/ol/source.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';

let openSansAdded = false;

const getText = function (feature, resolution, values) {
  const type = values.text;
  const maxResolution = Number.parseFloat(values.maxResolution);
  let text = feature.get('name');

  if (resolution > maxResolution) {
    text = '';
  } else if (type == 'hide') {
    text = '';
  } else if (type == 'shorten') {
    text = text.trunc(12);
  } else if (type == 'wrap' && values.placement != 'line') {
    text = stringDivider(text, 16, '\n');
  }

  return text;
};

const createTextStyle = function (feature, resolution, values) {
  const align = values.align;
  const baseline = values.baseline;
  const size = values.size;
  const height = values.height;
  const offsetX = Number(values.offsetX);
  const offsetY = Number(values.offsetY);
  const weight = values.weight;
  const placement = values.placement;
  const maxAngle = Number.parseFloat(values.maxAngle);
  const overflow = values.overflow == 'true';
  const rotation = (Number(values.rotation) / 180) * Math.PI;
  if (values.font == "'Open Sans'" && !openSansAdded) {
    const openSans = document.createElement('link');
    openSans.href = 'https://fonts.googleapis.com/css?family=Open+Sans';
    openSans.rel = 'stylesheet';
    document.getElementsByTagName('head')[0].appendChild(openSans);
    openSansAdded = true;
  }
  const font = weight + ' ' + size + '/' + height + ' ' + values.font;
  const fillColor = values.color;
  const outlineColor = values.outline;
  const outlineWidth = Number(values.outlineWidth);

  return new Text({
    textAlign: align == '' ? undefined : align,
    textBaseline: baseline,
    font: font,
    text: getText(feature, resolution, values),
    fill: new Fill({color: fillColor}),
    stroke: new Stroke({color: outlineColor, width: outlineWidth}),
    offsetX: offsetX,
    offsetY: offsetY,
    placement: placement,
    maxAngle: maxAngle,
    overflow: overflow,
    rotation: rotation,
    scale: [Number(values.scaleX) || 1, Number(values.scaleY) || 1],
  });
};

class Example {
  constructor(geometryType) {
    this.nodeList = this.createNodeList(geometryType);
    this.layer = this.createLayer(geometryType);
    this.layer.setStyle(this.createStyleFunction(this.readInputValues()));
    this.listenForInputChange();
  }

  listenForInputChange() {
    const boundInputChange = function () {
      this.layer.setStyle(this.createStyleFunction(this.readInputValues()));
    }.bind(this);
    this.nodeList.forEach(function (item) {
      item.node.addEventListener('input', boundInputChange);
    });
  }

  readInputValues() {
    return this.nodeList.reduce(function (values, item) {
      values[item.name] = item.node.value;
      return values;
    }, {});
  }

  createStyleFunction(values) {
    return function () {
      return null;
    };
  }

  createLayer(geometryType) {
    return new VectorLayer({
      source: new VectorSource({
        url: `data/geojson/${geometryType}-samples.geojson`,
        format: new GeoJSON(),
      }),
    });
  }

  getLayer() {
    return this.layer;
  }

  createNodeList(geometryType) {
    return [
      'align',
      'baseline',
      'color',
      'font',
      'height',
      'max-angle',
      'max-resolution',
      'offset-x',
      'offset-y',
      'outline-width',
      'outline',
      'overflow',
      'placement',
      'rotation',
      'scale-x',
      'scale-y',
      'size',
      'text',
      'weight',
    ].map(function (type) {
      return {
        node: document.getElementById(geometryType + 's-' + type),
        name: toCamelCase(type),
      };
    });
  }
}

class PolygonExample extends Example {
  constructor() {
    super('polygon');
  }
  createStyleFunction(values) {
    return function (feature, resolution) {
      return new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 1,
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.1)',
        }),
        text: createTextStyle(feature, resolution, values),
      });
    };
  }
}

class LineExample extends Example {
  constructor() {
    super('line');
  }
  createStyleFunction(values) {
    return function (feature, resolution) {
      return new Style({
        stroke: new Stroke({
          color: 'green',
          width: 2,
        }),
        text: createTextStyle(feature, resolution, values),
      });
    };
  }
}

class PointExample extends Example {
  constructor() {
    super('point');
  }
  createStyleFunction(values) {
    return function (feature, resolution) {
      return new Style({
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({color: 'rgba(255, 0, 0, 0.1)'}),
          stroke: new Stroke({color: 'red', width: 1}),
        }),
        text: createTextStyle(feature, resolution, values),
      });
    };
  }
}

const map = new Map({
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    new PolygonExample().getLayer(),
    new LineExample().getLayer(),
    new PointExample().getLayer(),
  ],
  target: 'map',
  view: new View({
    center: [-8161939, 6095025],
    zoom: 8,
  }),
});

/**
 * Convert 'offset-x' -> 'offsetX'
 * @param {string} string A string in caterpillar/caterpiller-case.
 * @return {string} The same string in camel case.
 */
function toCamelCase(string) {
  return string.replace(/-(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
}

/**
 * @param {number} n The max number of characters to keep.
 * @return {string} Truncated string.
 */
String.prototype.trunc =
  String.prototype.trunc ||
  function (n) {
    return this.length > n ? this.substr(0, n - 1) + '...' : this.substr(0);
  };

// http://stackoverflow.com/questions/14484787/wrap-text-in-javascript
function stringDivider(str, width, spaceReplacer) {
  if (str.length > width) {
    let p = width;
    while (p > 0 && str[p] != ' ' && str[p] != '-') {
      p--;
    }
    if (p > 0) {
      let left;
      if (str.substring(p, p + 1) == '-') {
        left = str.substring(0, p + 1);
      } else {
        left = str.substring(0, p);
      }
      const right = str.substring(p + 1);
      return left + spaceReplacer + stringDivider(right, width, spaceReplacer);
    }
  }
  return str;
}
