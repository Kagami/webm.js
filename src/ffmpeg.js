/**
 * FFmpeg wrapper. Manage pool of ffmpeg.js workers and provide
 * high-level Promise API on top of it.
 * @module webm/ffmpeg
 */

import {assert, has, remove} from "./util";

const WORKER_URL = require(
  "file?name=[hash:10].[name].[ext]!" +
  "ffmpeg.js/ffmpeg-worker-webm"
);

// Taken from webm.py
export function parseTime(time) {
  if (Number.isFinite(time)) return time;
  if (time === "N/A") return Number.MAX_SAFE_INTEGER;
  // [hh]:[mm]:[ss[.xxx]]
  const m = time.match(/^(?:(\d+):)?(?:(\d+)+:)?(\d+(?:\.\d+)?)$/);
  assert(m, "Invalid time " + time);
  const [hours, minutes, seconds] = m.slice(1);
  let duration = Number(seconds);
  if (hours) {
    if (minutes) {
      // 1:2:3 -> [1, 2, 3]
      duration += Number(minutes) * 60;
      duration += Number(hours) * 3600;
    } else {
      // 1:2 -> [1, undefined, 2]
      duration += Number(hours) * 60;
    }
  }
  return duration;
}

function pad2(n) {
  n |= 0;
  return n < 10 ? "0" + n : n.toString();
}

// Taken from webm.py
export function showTime(duration) {
  let ts = pad2(duration / 3600) + ":";
  ts += pad2(duration % 3600 / 60) + ":";
  ts += pad2(duration % 60);
  const frac = duration % 1;
  if (frac >= 0.1) {
    ts += frac.toString().slice(1, 3);
  }
  return ts;
}

export class Prober {
  static spawn() {
    let worker = new Worker(WORKER_URL);
    return new Promise(function(resolve, reject) {
      worker.onmessage = function(e) {
        const msg = e.data || {};
        if (msg.type === "ready") {
          delete worker.onmessage;
          delete worker.onerror;
          resolve(new Prober(worker));
        } else {
          worker.terminate();
          reject(new Error("Bad message from worker: " + msg));
        }
      };
      worker.onerror = function(e) {
        worker.terminate();
        reject(e);
      };
    });
  }

  constructor(worker) {
    this.worker = worker;
  }

  run(source) {
    let worker = this.worker;
    function cleanup() {
      delete worker.onmessage;
      delete worker.onerror;
    }
    return new Promise((resolve, reject) => {
      let log = [];
      let stderr = [];
      worker.postMessage({
        type: "run",
        arguments: ["-hide_banner", "-i", source.name],
        MEMFS: [source],
      });
      worker.onmessage = e => {
        const msg = e.data || {};
        // We are ignoring exit code here because FFmpeg exits with 1 if
        // output file wasn't specified. We also ignore unkwon messages
        // to be compatible with newer ffmpeg.js Worker API.
        switch (msg.type) {
        case "error":
          cleanup();
          reject(new Error(msg.data));
          break;
        case "stdout":
          log.push(msg.data);
          break;
        case "stderr":
          log.push(msg.data);
          stderr.push(msg.data);
          break;
        case "done":
          cleanup();
          log = log.join("\n");
          try {
            const info = Prober.parse(stderr);
            resolve(Object.assign({log}, info));
          } catch(err) {
            err.log = log;
            reject(err);
          }
          break;
        }
      };
      worker.onerror = e => {
        // NOTE(Kagami): We won't terminate worker here and hope that it
        // won't terminate by itself because we reuse the same Worker
        // instance many times to probe files.
        // TODO(Kagami): Though it may be rather cheap and safer to
        // respawn it each time? We need to measure the overhead and
        // also the memory consumption.
        cleanup();
        reject(e);
      };
    });
  }

  /**
   * Parse info about tracks and other video parameters from the FFmpeg
   * standart output. ffprobe provides more convenient output (has e.g.
   * JSON formatter) but let's stick with single executable (7M+
   * already) for now.
   * @throws {Error} Failed to parse output.
   */
  static parse(lines) {
    // TODO(Kagami): Delete this once
    // <https://github.com/kripken/emscripten/pull/3639> will be
    // released.
    lines = lines.filter(line =>
      !line.match(/^Calling stub instead of signal\(\)$/)
    );
    lines = lines.filter(line =>
      !line.match(/^\[.*Warning: not compiled with thread support/)
    );
    const out = lines.join("\n");

    const dur = out.match(/^\s+Duration:\s+([^,]+)/m);
    assert(dur, "Failed to parse duration");
    const duration = parseTime(dur[1]);

    let video = [];
    let audio = [];
    let subs = [];
    let tracks = {Video: video, Audio: audio, Subtitle: subs};
    let sre = /^\s+Stream\s+#0:(\d+)(?:\((\w+)\))?:\s+(\w+):\s+(\w+)(.*)/mg;
    let smatch, lastStream, lastIndex;
    function scanMetadata(index) {
      if (lastStream) {
        const meta = out.slice(lastIndex, index);
        const title = meta.match(/^\s+title\s*:\s*(.+)$/m);
        if (title) lastStream.title = title[1];
      }
    }
    while ((smatch = sre.exec(out)) !== null) {
      const [id, lang, type, codec, rest] = smatch.slice(1);
      if (!has(tracks, type)) continue;
      let stream = {id, lang, codec};
      if (rest.match(/\(default\)/)) stream.default = true;
      if (rest.match(/\(forced\)/)) stream.forced = true;
      tracks[type].push(stream);
      scanMetadata(smatch.index);
      lastStream = stream;
      lastIndex = smatch.index;
    }
    // XXX(Kagami): Text between last stream line and the end of output
    // might contain metadata information not related to last stream.
    scanMetadata();

    return {video, audio, subs, duration};
  }
}

/** Manager of FFmpeg jobs. */
export class Pool {
  constructor() {
    this._workers = [];
  }

  spawnJob({params, files, onLog}) {
    let workers = this._workers;
    let worker = new Worker(WORKER_URL);
    workers.push(worker);
    function cleanup() {
      worker.terminate();
      remove(workers, worker);
    }
    return new Promise(function(resolve, reject) {
      let ready = false;
      worker.onmessage = function(e) {
        const msg = e.data || {};
        if (!ready) {
          if (msg.type === "ready") {
            ready = true;
            worker.postMessage({
              type: "run",
              arguments: params,
              MEMFS: files,
            });
          } else {
            cleanup();
            reject(new Error("Bad message from worker: " + msg));
          }
          return;
        }
        switch (msg.type) {
        case "error":
          cleanup();
          reject(new Error(msg.data));
          break;
        case "stdout":
          onLog(msg.data);
          break;
        case "stderr":
          onLog(msg.data);
          break;
        case "exit":
          if (msg.data !== 0) {
            cleanup();
            reject(new Error("Process exited with " + msg.data));
          }
          break;
        case "done":
          cleanup();
          // FIXME(Kagami): Fix this in ffmpeg.js.
          let out = msg.data && msg.data.MEMFS || [];
          out.forEach(f => {
            if (!ArrayBuffer.isView(f.data)) {
              f.data = new Uint8Array(f.data);
            }
          });
          resolve(out);
          break;
        }
      };
      worker.onerror = function(e) {
        cleanup();
        reject(e);
      };
    });
  }

  /** Destroy the pool. Safe to run multiple times. */
  destroy() {
    while (this._workers.length) {
      this._workers.shift().terminate();
    }
  }
}
