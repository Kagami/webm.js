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

export function fixopt(arr, key, newval, opts) {
  opts = opts || {};
  let found = false;
  let prev;
  arr = arr.map(cur => {
    if (prev) {
      found = true;
      prev = false;
      return typeof newval === "function" ? newval(cur) : newval;
    } else if (cur === key) {
      prev = true;
      return cur;
    } else {
      return cur;
    }
  });
  if (!found) {
    if (opts.insert) {
      return [key, newval].concat(arr);
    } else if (opts.append) {
      return arr.concat(key, newval);
    }
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

export function range(n, start) {
  return [...Array(n)].map((_, i) => i + start);
}

export function str2ab(str) {
  // Probably not so fast and won't work for non-ASCII, but ok for our
  // use case.
  return new Uint8Array(str.split("").map(ch => ch.charCodeAt(0)));
}

export const MIN_VTHREADS = 1;
export const MAX_VTHREADS = 8;
export const FALLBACK_VTHREADS = 4;
export const DEFAULT_VTHREADS = (function() {
  let threadNum = navigator.hardwareConcurrency || FALLBACK_VTHREADS;
  // Navigator will contain number of cores including HT, e.g. 8 for a
  // CPU with 4 physical cores. This would be too much given the
  // memory consumption, additional audio thread, etc.
  if (threadNum > FALLBACK_VTHREADS) threadNum = FALLBACK_VTHREADS;
  return threadNum;
})();

/*
 * We need to fix the input name in order to avoid cluttering with
 * output (because we use constant names like "1.webm") and also to
 * avoid complex whitespace escaping with rawopts.
 *
 * test.avi -> in.avi
 * test -> in
 */
export function getSafeFilename(name) {
  function getSafeExt(str) {
    return str.match(/^\.\w+$/) ? str : "";
  }

  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1) {
    return "in";
  } else {
    return "in" + getSafeExt(name.slice(dotIndex));
  }
}

export function download(url) {
  return new Promise(function(resolve, reject) {
    let req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.responseType = "arraybuffer";
    req.onload = function() {
      if (req.status >= 200 && req.status < 400) {
        resolve(req.response);
      } else {
        reject(new Error(req.status));
      }
    };
    req.onerror = function(e) {
      reject(e);
    };
    req.send();
  });
}
