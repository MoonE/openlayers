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

function getText(feature, resolution, values) {
  const type = values.text;
  const maxResolution = Number(values.maxResolution);
  let text = feature.get('name');

  if (resolution > maxResolution) {
    text = '';
  } else if (type === 'hide') {
    text = '';
  } else if (type === 'shorten') {
    text = text.trunc(12);
  } else if (type === 'wrap' && values.placement !== 'line') {
    text = stringDivider(text, 16, '\n');
  }

  return text;
}

function createTextStyle(values) {
  const align = values.align;
  const baseline = values.baseline;
  const size = values.size;
  const height = values.height;
  const offsetX = Number(values.offsetX) || 0;
  const offsetY = Number(values.offsetY) || 0;
  const weight = values.weight;
  const placement = values.placement;
  const maxAngle = (Number(values.maxAngle) / 180) * Math.PI;
  const overflow = values.overflow;
  const rotation = (Number(values.rotation) / 180) * Math.PI;
  if (!openSansAdded && values.font === "'Open Sans'") {
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
  const scaleX = Number(values.scaleX);
  const scaleY = Number(values.scaleY);

  return new Text({
    textAlign: align == '' ? undefined : align,
    textBaseline: baseline,
    font: font,
    fill: new Fill({color: fillColor}),
    stroke: values.outlineEnabled
      ? new Stroke({color: outlineColor, width: outlineWidth})
      : undefined,
    offsetX: offsetX,
    offsetY: offsetY,
    placement: placement,
    maxAngle: Number.isNaN(maxAngle) ? undefined : maxAngle,
    overflow: overflow,
    rotation: rotation,
    backgroundFill: values.backgroundFillEnabled
      ? new Fill({color: values.backgroundFill})
      : undefined,
    backgroundStroke: values.backgroundStrokeEnabled
      ? new Stroke({color: values.backgroundStroke})
      : undefined,
    scale: [
      Number.isNaN(scaleX) ? 1 : scaleX,
      Number.isNaN(scaleY) ? 1 : scaleX,
    ],
  });
}

class Example {
  constructor(geometryType, map) {
    this.map = map;
    this.geometryType = geometryType;
    this.declutter = false;
    this.nodeList = this.createNodeList(geometryType);
    this.values = this.readInputValues();
    this.style = this.createStyle(this.values);
    this.addLayer();
    this.listenForInputChange();
  }

  setDeclutter(declutter) {
    if (declutter !== this.declutter) {
      this.declutter = declutter;
      this.addLayer();
    }
  }

  addLayer() {
    if (this.layer) {
      this.map.removeLayer(this.layer);
    }
    this.layer = this.createLayer();
    this.map.addLayer(this.layer);
  }

  listenForInputChange() {
    const boundInputChange = function () {
      this.values = this.readInputValues();
      this.setDeclutter(this.values.declutter);
      this.style = this.createStyle(this.values);
      this.layer.changed();
    }.bind(this);
    this.nodeList.forEach(function (item) {
      item.node.addEventListener('input', boundInputChange);
    });
  }

  readInputValues() {
    return this.nodeList.reduce(function (values, item) {
      const valueProperty =
        item.node.nodeName === 'INPUT' && item.node.type === 'checkbox'
          ? 'checked'
          : 'value';
      values[item.name] = item.node[valueProperty];
      return values;
    }, {});
  }

  createStyle(values) {
    throw new Error('Abstract method');
  }

  createLayer() {
    return new VectorLayer({
      declutter: this.declutter,
      source: new VectorSource({
        url: `data/geojson/${this.geometryType}-samples.geojson`,
        format: new GeoJSON(),
      }),
      style: function (feature, resolution) {
        const text = getText(feature, resolution, this.values);
        this.style.getText().setText(text);
        return this.style;
      }.bind(this),
    });
  }

  getLayer() {
    return this.layer;
  }

  createNodeList(geometryType) {
    return [
      'align',
      'background-fill',
      'background-fill-enabled',
      'background-stroke',
      'background-stroke-enabled',
      'baseline',
      'color',
      'declutter',
      'font',
      'height',
      'max-angle',
      'max-resolution',
      'offset-x',
      'offset-y',
      'outline-enabled',
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
    ]
      .map((type) => {
        return {
          node: document.getElementById(geometryType + 's-' + type),
          name: toCamelCase(type),
        };
      })
      .filter((item) => item.node);
  }
}

class PointExample extends Example {
  constructor(map) {
    super('point', map);
  }
  createStyle(values) {
    return new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({color: 'red'}),
      }),
      text: createTextStyle(values),
    });
  }
}

class LineExample extends Example {
  constructor(map) {
    super('line', map);
  }
  createStyle(values) {
    return new Style({
      stroke: new Stroke({
        color: 'green',
        width: 2,
      }),
      text: createTextStyle(values),
    });
  }
}

class PolygonExample extends Example {
  constructor(map) {
    super('polygon', map);
  }
  createStyle(values) {
    return new Style({
      stroke: new Stroke({
        color: 'blue',
        width: 1,
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)',
      }),
      text: createTextStyle(values),
    });
  }
}

const map = new Map({
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  target: 'map',
  view: new View({
    center: [-8161939, 6095025],
    zoom: 8,
  }),
});

const examples = [
  new PointExample(map),
  new LineExample(map),
  new PolygonExample(map),
];

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
