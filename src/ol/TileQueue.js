/**
 * @module ol/TileQueue
 */
import EventType from './events/EventType.js';
import PriorityQueue, {DROP} from './structs/PriorityQueue.js';
import TileState from './TileState.js';

/**
 * @typedef {function(import("./Tile.js").default, string, import("./coordinate.js").Coordinate, number): number} PriorityFunction
 */

class TileQueue extends PriorityQueue {
  /**
   * @param {PriorityFunction} tilePriorityFunction Tile priority function.
   * @param {function(): ?} tileChangeCallback Function called on each tile change event.
   */
  constructor(tilePriorityFunction, tileChangeCallback) {
    super(
      /**
       * @param {Array} element Element.
       * @return {number} Priority.
       */
      function (element) {
        return tilePriorityFunction.apply(null, element);
      },
      /**
       * @param {Array} element Element.
       * @return {string} Key.
       */
      function (element) {
        return /** @type {import("./Tile.js").default} */ (element[0]).getKey();
      }
    );

    /** @private */
    this.boundHandleTileChange_ = this.handleTileChange.bind(this);

    /**
     * @private
     * @type {function(): ?}
     */
    this.tileChangeCallback_ = tileChangeCallback;

    /**
     * @private
     * @type {number}
     */
    this.tilesLoading_ = 0;

    /**
     * @private
     * @type {!Object<string,boolean>}
     */
    this.tilesLoadingKeys_ = {};
  }

  /**
   * @param {Array} element Element.
   * @return {boolean} The element was added to the queue.
   */
  enqueue(element) {
    const tile = element[0];
    if (tile.getState() === TileState.LOADING) {
      const key = tile.getKey();
      if (key in this.tilesLoadingKeys_) {
        return false;
      }
      ++this.tilesLoading_;
      this.tilesLoadingKeys_[key] = tile;
      tile.addEventListener(EventType.CHANGE, this.boundHandleTileChange_);
      return true;
    }
    if (!super.enqueue(element)) {
      return false;
    }
    tile.addEventListener(EventType.CHANGE, this.boundHandleTileChange_);
  }

  /**
   * @param {string} key Key.
   * @return {boolean} Is key queued.
   */
  isKeyQueued(key) {
    return key in this.tilesLoadingKeys_ || super.isKeyQueued(key);
  }

  /**
   * @param {Array} element Element.
   * @return {boolean} Is queued.
   */
  isQueued(element) {
    const key = /** @type {import("./Tile.js").default} */ (
      element[0]
    ).getKey();
    return key in this.tilesLoadingKeys_ || super.isQueued(element);
  }

  /**
   * @return {number} Number of tiles loading.
   */
  getTilesLoading() {
    return this.tilesLoading_;
  }

  /**
   * @param {import("./events/Event.js").default} event Event.
   * @protected
   */
  handleTileChange(event) {
    const tile = /** @type {import("./Tile.js").default} */ (event.target);
    const state = tile.getState();
    if (
      state === TileState.LOADED ||
      state === TileState.ERROR ||
      state === TileState.EMPTY
    ) {
      if (state !== TileState.ERROR) {
        tile.removeEventListener(EventType.CHANGE, this.boundHandleTileChange_);
      }
      const tileKey = tile.getKey();
      if (tileKey in this.tilesLoadingKeys_) {
        delete this.tilesLoadingKeys_[tileKey];
        --this.tilesLoading_;
      }
      this.tileChangeCallback_();
    }
  }

  /**
   * @param {number} maxTotalLoading Maximum number tiles to load simultaneously.
   * @param {number} maxNewLoads Maximum number of new tiles to load.
   */
  loadMoreTiles(maxTotalLoading, maxNewLoads) {
    let state, tile, tileKey;
    const limit = Math.min(maxTotalLoading, this.tilesLoading_ + maxNewLoads);
    while (this.tilesLoading_ < limit && !this.isEmpty()) {
      tile = /** @type {import("./Tile.js").default} */ (this.dequeue()[0]);
      tileKey = tile.getKey();
      state = tile.getState();
      if (state === TileState.IDLE && !(tileKey in this.tilesLoadingKeys_)) {
        this.tilesLoadingKeys_[tileKey] = true;
        ++this.tilesLoading_;
        tile.load();
      }
    }
  }
}

export default TileQueue;

/**
 * @param {import('./Map.js').FrameState} frameState Frame state.
 * @param {import("./Tile.js").default} tile Tile.
 * @param {string} tileSourceKey Tile source key.
 * @param {import("./coordinate.js").Coordinate} tileCenter Tile center.
 * @param {number} tileResolution Tile resolution.
 * @return {number} Tile priority.
 */
export function getTilePriority(
  frameState,
  tile,
  tileSourceKey,
  tileCenter,
  tileResolution
) {
  // Filter out tiles at higher zoom levels than the current zoom level, or that
  // are outside the visible extent.
  if (!frameState || !(tileSourceKey in frameState.wantedTiles)) {
    return DROP;
  }
  if (!frameState.wantedTiles[tileSourceKey][tile.getKey()]) {
    return DROP;
  }
  // Prioritize the highest zoom level tiles closest to the focus.
  // Tiles at higher zoom levels are prioritized using Math.log(tileResolution).
  // Within a zoom level, tiles are prioritized by the distance in pixels between
  // the center of the tile and the center of the viewport.  The factor of 65536
  // means that the prioritization should behave as desired for tiles up to
  // 65536 * Math.log(2) = 45426 pixels from the focus.
  const center = frameState.viewState.center;
  const deltaX = tileCenter[0] - center[0];
  const deltaY = tileCenter[1] - center[1];
  return (
    65536 * Math.log(tileResolution) +
    Math.sqrt(deltaX * deltaX + deltaY * deltaY) / tileResolution
  );
}
