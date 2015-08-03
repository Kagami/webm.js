/**
 * Helper routines and widgets.
 * @module webm/util
 */

export {default as ShowHide} from "./show-hide";

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

export function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function ahas(arr, value) {
  return arr.indexOf(value) !== -1;
}

export function getopt(arr, key, def) {
  let prev;
  for (let i = 0; i < arr.length; ++i) {
    const cur = arr[i];
    if (prev) {
      return cur;
    } else if (cur === key) {
      prev = true;
    }
  }
  return def;
}

export function clearopt(arr, key) {
  let prev;
  return arr.filter(cur => {
    if (prev) {
      prev = false;
      return false;
    } else if (cur === key) {
      prev = true;
      return false;
    } else {
      return true;
    }
  });
}

export function fixopt(arr, key, newval) {
  let prev;
  return arr.map(cur => {
    if (prev) {
      prev = false;
      return newval;
    } else if (cur === key) {
      prev = true;
      return cur;
    } else {
      return cur;
    }
  });
}

export function remove(arr, value) {
  const index = arr.indexOf(value);
  if (index !== -1) {
    arr.splice(index, value);
  }
  return arr;
}

// Taken from webm.py
export function showSize(size) {
  let info = size + " B";
  if (size >= 1024) {
    info += ", " + (size / 1024).toFixed(2) + " KiB";
  }
  if (size >= 1024 * 1024) {
    info += ", " + (size / 1024 / 1024).toFixed(2) + " MiB";
  }
  return info;
}

export function pad2(n) {
  n |= 0;
  return n < 10 ? "0" + n : n.toString();
}

export function showNow() {
  const now = new Date();
  let ts = pad2(now.getHours()) + ":";
  ts += pad2(now.getMinutes()) + ":";
  ts += pad2(now.getSeconds());
  return ts;
}
