/**
 * Helper routines and widgets.
 * @module webm/util
 */

export {default as ShowHide} from "./show-hide";

export const MAX_SAFE_INTEGER = 9007199254740991;

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

export function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function isNumber(n) {
  return typeof n === "number" && isFinite(n);
}
