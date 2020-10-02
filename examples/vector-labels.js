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
  const maxResolution = Math.pow(2, Number(values.maxResolution));
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
  if (!openSansAdded && values.font === "'Open Sans'") {
    const openSans = document.createElement('link');
    openSans.href = 'https://fonts.googleapis.com/css?family=Open+Sans';
    openSans.rel = 'stylesheet';
    document.getElementsByTagName('head')[0].appendChild(openSans);
    openSansAdded = true;
  }
  const font =
    values.weight + ' ' + values.size + '/' + values.height + ' ' + values.font;
  const scaleX = values.scaleX === '' ? 1 : Number(values.scaleX);
  const scaleY = values.scaleY === '' ? 1 : Number(values.scaleY);
  return new Text({
    backgroundFill: values.backgroundFillEnabled
      ? new Fill({color: values.backgroundFill})
      : undefined,
    backgroundStroke: values.backgroundStrokeEnabled
      ? new Stroke({
          color: values.backgroundStroke,
          width: Number(values.backgroundStrokeWidth) || 0,
        })
      : undefined,
    fill: new Fill({color: values.color}),
    font: font,
    maxAngle: (Number(values.maxAngle) || 0) * (Math.PI / 180),
    offsetX: Number(values.offsetX) || 0,
    offsetY: Number(values.offsetY) || 0,
    overflow: values.overflow,
    padding: [
      Number(values.paddingTop) || 0,
      Number(values.paddingRight) || 0,
      Number(values.paddingBottom) || 0,
      Number(values.paddingLeft) || 0,
    ],
    placement: values.placement,
    rotateWithView: values.rotateWithView,
    rotation: (Number(values.rotation) || 0) * (Math.PI / 180),
    scale: [
      Number.isNaN(scaleX) ? 1 : scaleX,
      Number.isNaN(scaleY) ? 1 : scaleY,
    ],
    stroke: values.outlineEnabled
      ? new Stroke({
          color: values.outline,
          width: Number(values.outlineWidth) || 0,
        })
      : undefined,
    textAlign: values.align === '' ? undefined : values.align,
    textBaseline: values.baseline,
  });
}

class Example {
  constructor(geometryType, map) {
    this.map = map;
    this.geometryType = geometryType;
    this.nodeList = this.createNodeList(geometryType);
    this.values = this.readInputValues();
    this.style = this.createStyle(this.values);
    this.declutter = this.values.declutter;
    this.source = new VectorSource({
      url: `data/geojson/${geometryType}-samples.geojson`,
      format: new GeoJSON(),
    });
    this.styleFn = function (feature, resolution) {
      const text = getText(feature, resolution, this.values);
      this.style.getText().setText(text);
      return this.style;
    }.bind(this);
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
      if (item.radios) {
        Array.prototype.forEach.call(item.radios, (radio) =>
          radio.addEventListener('input', boundInputChange)
        );
      } else {
        item.node.addEventListener('input', boundInputChange);
      }
    });
  }

  readInputValues() {
    return this.nodeList.reduce(function (values, item) {
      if (item.radios) {
        const radio = Array.prototype.find.call(
          item.radios,
          (radio) => radio.checked
        );
        values[item.name] = radio ? radio.value : null;
      } else {
        values[item.name] = item.node[item.valueProperty];
      }
      return values;
    }, {});
  }

  createStyle(values) {
    throw new Error('Abstract method');
  }

  createLayer() {
    return new VectorLayer({
      declutter: this.declutter,
      source: this.source,
      style: this.styleFn,
    });
  }

  createNodeList(geometryType) {
    const idPrefix = geometryType + 's-';
    return Array.prototype.map.call(
      document.getElementById(idPrefix + 'edit-form').querySelectorAll('[id]'),
      (node) => {
        const radios = node.querySelectorAll('input[type="radio"]');
        return {
          node: node,
          radios: radios.length > 0 ? radios : undefined,
          name: toCamelCase(node.id.replace(idPrefix, '')),
          valueProperty:
            node.nodeName === 'INPUT' && node.type === 'checkbox'
              ? 'checked'
              : 'value',
        };
      }
    );
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
        fill: new Fill({color: values.color}),
        stroke: values.outlineEnabled
          ? new Stroke({
              width: Number(values.outlineWidth) || 0,
              color: values.outline,
            })
          : undefined,
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
        color: values.color,
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
        color: values.color,
        width: 1,
      }),
      fill: new Fill({
        color: /^#(?:[0-9a-f]{3}){1,2}$/.test(values.color)
          ? values.color + (values.color.length === 4 ? '2' : '22')
          : values.color,
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
 * @param {string} string A string in caterpillar/kebab-case.
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
    return this.length > n ? this.substr(0, n - 1) + '…' : this.substr(0);
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
