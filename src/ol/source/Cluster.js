/**
 * @module ol/source/Cluster
 */

import EventType from '../events/EventType.js';
import Feature from '../Feature.js';
import GeometryType from '../geom/GeometryType.js';
import Point from '../geom/Point.js';
import VectorSource from './Vector.js';
import {add as addCoordinate, scale as scaleCoordinate} from '../coordinate.js';
import {assert} from '../asserts.js';
import {
  buffer,
  createEmpty,
  createOrUpdateFromCoordinate,
  getCenter,
} from '../extent.js';
import {clamp} from '../math.js';
import {getUid} from '../util.js';
import {fromExtent as polygonFromExtent} from '../geom/Polygon.js';

/**
 * @typedef {Object} Options
 * @property {import("./Source.js").AttributionLike} [attributions] Attributions.
 * @property {number} [distance=20] Minimum distance in pixels between clusters.
 * @property {function(Feature):Point} [geometryFunction]
 * Function that takes an {@link module:ol/Feature} as argument and returns an
 * {@link module:ol/geom/Point} as cluster calculation point for the feature. When a
 * feature should not be considered for clustering, the function should return
 * `null`. The default, which works when the underyling source contains point
 * features only, is
 * ```js
 * function(feature) {
 *   return feature.getGeometry();
 * }
 * ```
 * See {@link module:ol/geom/Polygon~Polygon#getInteriorPoint} for a way to get a cluster
 * calculation point for polygons.
 * @property {VectorSource} [source] Source.
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 * @property {number} [factor=1] Position of cluster source at center point of all feature
 * coordinates at 1. A the center of the searched rect when 0.
 * @property {boolean} [randomize=false] Randomize the order in which features are added to clusters.
 */

/**
 * @classdesc
 * Layer source to cluster vector data. Works out of the box with point
 * geometries. For other geometry types, or if not all geometries should be
 * considered for clustering, a custom `geometryFunction` can be defined.
 *
 * If the instance is disposed without also disposing the underlying
 * source `setSource(null)` has to be called to remove the listener reference
 * from the wrapped source.
 * @api
 */
class Cluster extends VectorSource {
  /**
   * @param {Options} options Cluster options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      wrapX: options.wrapX,
    });

    /**
     * @type {number|undefined}
     * @protected
     */
    this.resolution = undefined;

    /**
     * @type {number}
     * @protected
     */
    this.distance = options.distance !== undefined ? options.distance : 20;

    /**
     * @type {Array<Feature>}
     * @protected
     */
    this.features = [];

    /**
     * @param {Feature} feature Feature.
     * @return {Point} Cluster calculation point.
     * @protected
     */
    this.geometryFunction =
      options.geometryFunction ||
      function (feature) {
        const geometry = feature.getGeometry();
        assert(geometry.getType() == GeometryType.POINT, 10); // The default `geometryFunction` can only handle `Point` geometries
        return geometry;
      };

    this.boundRefresh_ = this.refresh.bind(this);

    this.factor = options.factor === undefined ? 1 : options.factor;

    this.randomize =
      options.randomize === undefined ? false : options.randomize;

    this.setSource(options.source || null);
  }

  /**
   * Remove all features from the source.
   * @param {boolean} [opt_fast] Skip dispatching of {@link module:ol/source/Vector.VectorSourceEvent#removefeature} events.
   * @api
   */
  clear(opt_fast) {
    this.features.length = 0;
    super.clear(opt_fast);
  }

  /**
   * Get the distance in pixels between clusters.
   * @return {number} Distance.
   * @api
   */
  getDistance() {
    return this.distance;
  }

  /**
   * Get a reference to the wrapped source.
   * @return {VectorSource} Source.
   * @api
   */
  getSource() {
    return this.source;
  }

  /**
   * @param {import("../extent.js").Extent} extent Extent.
   * @param {number} resolution Resolution.
   * @param {import("../proj/Projection.js").default} projection Projection.
   */
  loadFeatures(extent, resolution, projection) {
    this.source.loadFeatures(extent, resolution, projection);
    if (resolution !== this.resolution) {
      this.clear();
      this.resolution = resolution;
      this.cluster();
      this.addFeatures(this.features);
    }
  }

  /**
   * Set the distance in pixels between clusters.
   * @param {number} distance The distance in pixels.
   * @api
   */
  setDistance(distance) {
    this.distance = distance;
    this.refresh();
  }

  updateFactor(factor) {
    this.factor = clamp(factor, 0, 1);
    this.applyFactor();
  }

  applyFactor() {
    const factor = this.factor;
    this.features.forEach(function (feature) {
      const meta = feature.get('meta');
      const point = [
        meta.centroid[0] * factor + meta.searchCenter[0] * (1 - factor),
        meta.centroid[1] * factor + meta.searchCenter[1] * (1 - factor),
      ];
      feature.setGeometry(new Point(point));
    });
    this.changed();
  }

  setRandomize(randomize) {
    const old = this.randomize;
    this.randomize = randomize;
    if (old !== randomize) {
      this.refresh();
    }
  }

  /**
   * Replace the wrapped source.
   * @param {VectorSource} source The new source for this instance.
   * @api
   */
  setSource(source) {
    if (this.source) {
      this.source.removeEventListener(EventType.CHANGE, this.boundRefresh_);
    }
    this.source = source;
    if (source) {
      source.addEventListener(EventType.CHANGE, this.boundRefresh_);
    }
    this.refresh();
  }

  /**
   * Handle the source changing.
   */
  refresh() {
    this.clear();
    this.cluster();
    this.addFeatures(this.features);
  }

  /**
   * @protected
   */
  cluster() {
    if (this.resolution === undefined || !this.source) {
      return;
    }
    const extent = createEmpty();
    const mapDistance = this.distance * this.resolution;
    const features = this.source.getFeatures();

    if (this.randomize) {
      for (let i = 0, ii = features.length; i < ii; ++i) {
        const idx = Math.floor(Math.random() * ii);
        const feature = features[i];
        features[i] = features[idx];
        features[idx] = feature;
      }
    }

    /**
     * @type {Object<string, true>}
     */
    const clustered = {};

    for (let i = 0, ii = features.length; i < ii; i++) {
      const feature = features[i];
      if (!(getUid(feature) in clustered)) {
        const geometry = this.geometryFunction(feature);
        if (geometry) {
          const coordinates = geometry.getCoordinates();
          createOrUpdateFromCoordinate(coordinates, extent);
          buffer(extent, mapDistance, extent);

          let neighbors = this.source.getFeaturesInExtent(extent);
          neighbors = neighbors.filter(function (neighbor) {
            const uid = getUid(neighbor);
            if (uid in clustered) {
              return false;
            }
            clustered[uid] = true;
            return true;
          });
          const cluster = this.createCluster(neighbors, extent);
          this.features.push(cluster);
        }
      }
    }
    if (this.features.length === 1) {
      this.features[0].get('meta').order = 0;
    } else {
      const max = this.features.length - 1;
      this.features.forEach(function (cluster, idx) {
        cluster.get('meta').order = idx / max;
      });
    }
    this.applyFactor();
  }

  /**
   * @param {Array<Feature>} features Features
   * @param {Array<number>} extent The search rect for this cluster feature.
   * @return {Feature} The cluster feature.
   * @protected
   */
  createCluster(features, extent) {
    const centroid = [0, 0];
    for (let i = features.length - 1; i >= 0; --i) {
      const geometry = this.geometryFunction(features[i]);
      if (geometry) {
        addCoordinate(centroid, geometry.getCoordinates());
      } else {
        features.splice(i, 1);
      }
    }
    scaleCoordinate(centroid, 1 / features.length);
    const searchCenter = getCenter(extent);
    const cluster = new Feature({
      features: features,
      meta: {
        centroid: centroid,
        searchCenter: searchCenter,
        searchRect: polygonFromExtent(extent),
      },
    });
    return cluster;
  }
}

export default Cluster;
