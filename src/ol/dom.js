import {WORKER_OFFSCREEN_CANVAS} from './has.js';

/**
 * @module ol/dom
 */

//FIXME Move this function to the canvas module
/**
 * Create an html canvas element and returns its 2d context.
 * @param {number} [opt_width] Canvas width.
 * @param {number} [opt_height] Canvas height.
 * @param {Array<HTMLCanvasElement>} [opt_canvasPool] Canvas pool to take existing canvas from.
 * @param {CanvasRenderingContext2DSettings} [opt_Context2DSettings] CanvasRenderingContext2DSettings
 * @return {CanvasRenderingContext2D} The context.
 */
export function createCanvasContext2D(
  opt_width,
  opt_height,
  opt_canvasPool,
  opt_Context2DSettings
) {
  /** @type {HTMLCanvasElement|OffscreenCanvas} */
  let canvas;
  if (opt_canvasPool && opt_canvasPool.length) {
    canvas = opt_canvasPool.shift();
  } else if (WORKER_OFFSCREEN_CANVAS) {
    canvas = new OffscreenCanvas(opt_width || 300, opt_height || 300);
  } else {
    canvas = document.createElement('canvas');
    canvas.style.all = 'unset';
  }
  if (opt_width) {
    canvas.width = opt_width;
  }
  if (opt_height) {
    canvas.height = opt_height;
  }
  //FIXME Allow OffscreenCanvasRenderingContext2D as return type
  return /** @type {CanvasRenderingContext2D} */ (
    canvas.getContext('2d', opt_Context2DSettings)
  );
}

/**
 * Check if the element and all its parents are inside the DOM and all are
 * set to be displayed.
 * @param {HTMLElement} element The element to check.
 * @return {boolean} Whether the element is rendered
 */
export function isDisplayedInDom(element) {
  return element.getClientRects().length !== 0;
}

/**
 * Get the current computed width and height for the given element excluding
 * margin, padding and border.
 * @param {HTMLElement} element The element to measure
 * @return {import("./size.js").Size|undefined} An array with width and height in pixels (floats)
 * or undefined if the element is currently not rendered.
 */
export function innerSize(element) {
  if (!isDisplayedInDom(element)) {
    return undefined;
  }
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const width =
    rect.right -
    rect.left -
    parseFloat(style['paddingRight']) -
    parseFloat(style['paddingLeft']) -
    parseFloat(style['borderRightWidth']) -
    parseFloat(style['borderLeftWidth']);
  const height =
    rect.bottom -
    rect.top -
    parseFloat(style['paddingTop']) -
    parseFloat(style['paddingBottom']) -
    parseFloat(style['borderTopWidth']) -
    parseFloat(style['borderBottomWidth']);
  return [width, height];
}

/**
 * Get the current computed width and height for the given element including
 * margin, padding and border.
 * @param {HTMLElement} element The element to measure
 * @return {import("./size.js").Size|undefined} An array with width and height in pixels
 * (floats) or undefined if the element is currently not rendered.
 */
export function outerSize(element) {
  if (!isDisplayedInDom(element)) {
    return undefined;
  }
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const width =
    rect.right -
    rect.left +
    parseFloat(style.marginLeft) +
    parseFloat(style.marginRight);
  const height =
    rect.bottom -
    rect.top +
    parseFloat(style.marginTop) +
    parseFloat(style.marginBottom);
  return [width, height];
}

/**
 * @param {Node} newNode Node to replace old node
 * @param {Node} oldNode The node to be replaced
 */
export function replaceNode(newNode, oldNode) {
  const parent = oldNode.parentNode;
  if (parent) {
    parent.replaceChild(newNode, oldNode);
  }
}

/**
 * @param {Node} node The node to remove.
 * @return {Node} The node that was removed or null.
 */
export function removeNode(node) {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
}

/**
 * @param {Node} node The node to remove the children from.
 */
export function removeChildren(node) {
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }
}

/**
 * Transform the children of a parent node so they match the
 * provided list of children.  This function aims to efficiently
 * remove, add, and reorder child nodes while maintaining a simple
 * implementation (it is not guaranteed to minimize DOM operations).
 * @param {Node} node The parent node whose children need reworking.
 * @param {Array<Node>} children The desired children.
 */
export function replaceChildren(node, children) {
  const oldChildren = node.childNodes;

  for (let i = 0; true; ++i) {
    const oldChild = oldChildren[i];
    const newChild = children[i];

    // check if our work is done
    if (!oldChild && !newChild) {
      break;
    }

    // check if children match
    if (oldChild === newChild) {
      continue;
    }

    // check if a new child needs to be added
    if (!oldChild) {
      node.appendChild(newChild);
      continue;
    }

    // check if an old child needs to be removed
    if (!newChild) {
      node.removeChild(oldChild);
      --i;
      continue;
    }

    // reorder
    node.insertBefore(newChild, oldChild);
  }
}
