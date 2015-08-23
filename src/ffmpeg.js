/**
 * FFmpeg wrapper. Manage pool of ffmpeg.js workers and provide
 * high-level Promise API on top of it.
 * @module webm/ffmpeg
 */

import {assert, has, pad2, WORKERFS_DIR} from "./util";

const WORKER_URL = require(
  "file?name=[hash:10].[name].[ext]!" +
  "ffmpeg.js/ffmpeg-worker-webm"
);

const DECODE_MEMORY = 134217728;
const ENCODE_MEMORY = 268435456;

// Taken from webm.py
export function parseTime(time) {
  if (Number.isFinite(time)) return time;
  // [hh]:[mm]:[ss[.xxx]]
  const m = time.match(/^(?:(\d+):)?(?:(\d+)+:)?(\d+(?:\.\d+)?)$/);
  assert(m, "Invalid time");
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

// Taken from webm.py
export function showTime(duration, opts) {
  opts = opts || {};
  const sep = opts.sep || ":";
  let ts = pad2(duration / 3600) + sep;
  ts += pad2(duration % 3600 / 60) + sep;
  ts += pad2(duration % 60);
  const frac = duration % 1 || 0.01;
  if (frac >= 0.1 || opts.fixed) {
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

  analyze(source) {
    let worker = this.worker;
    function cleanup() {
      delete worker.onmessage;
      delete worker.onerror;
    }
    return new Promise((resolve, reject) => {
      let log = [];
      let stderr = [];
      const wfsMount = {
        type: "WORKERFS",
        opts: {blobs: [source]},
        mountpoint: WORKERFS_DIR,
      };
      worker.postMessage({
        type: "run",
        arguments: ["-hide_banner", "-i", source.path],
        TOTAL_MEMORY: DECODE_MEMORY,
        mounts: [wfsMount],
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

  decode({source, time, count}) {
    let worker = this.worker;
    function cleanup() {
      delete worker.onmessage;
      delete worker.onerror;
    }
    return new Promise((resolve, reject) => {
      const wfsMount = {
        type: "WORKERFS",
        opts: {blobs: [source]},
        mountpoint: WORKERFS_DIR,
      };
      // TODO(Kagami): Use selected video track, burn subs?
      worker.postMessage({
        type: "run",
        arguments: [
          "-ss", time + "",
          "-i", source.path,
          "-map", "0:v:0",
          "-frames:v", count + "",
          "-qscale:v", "2",
          "-loglevel", "fatal",
          "%02d.jpg",
        ],
        TOTAL_MEMORY: DECODE_MEMORY,
        mounts: [wfsMount],
      });
      worker.onmessage = e => {
        const msg = e.data || {};
        switch (msg.type) {
        case "error":
          cleanup();
          reject(new Error(msg.data));
          break;
        case "exit":
          if (msg.data !== 0) {
            cleanup();
            reject(new Error("Process exited with " + msg.data));
          }
          break;
        case "done":
          cleanup();
          resolve(msg.data.MEMFS);
          break;
        }
      };
      worker.onerror = e => {
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
    lines = lines.filter(line =>
      !line.match(/^\[.*Warning: not compiled with thread support/)
    );
    // This should now contain only common FFmpeg logging.
    const out = lines.join("\n");

    const dur = out.match(/^\s+Duration:\s+([^,]+)/m);
    assert(dur, "Failed to parse duration");
    const duration = parseTime(dur[1]);
    assert(duration, "Zero duration");

    let video = [];
    let audio = [];
    let subs = [];
    let tracks = {Video: video, Audio: audio, Subtitle: subs};
    let sre = /^\s+Stream\s+#0:(\d+)(?:\((\w+)\))?:\s+(\w+):\s+(\w+)(.*)/mg;
    let smatch, lastStream, lastIndex;
    let si = 0;
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
      if (type === "Video") {
        const resm = rest.match(/,\s+(\d+)x(\d+)[,\s]/);
        assert(resm, "Failed to parse resolution");
        stream.width = Number(resm[1]);
        stream.height = Number(resm[2]);
        const fpsm = rest.match(/\b(\d+(\.\d+)?)\s+fps\b/);
        assert(fpsm, "Failed to parse fps");
        stream.fps = Number(fpsm[1]);
        assert(stream.width && stream.height && stream.fps, "Bad video params");
      }
      if (type === "Subtitle") stream.si = si++;
      if (rest.match(/\(default\)/)) stream.default = true;
      if (rest.match(/\(forced\)/)) stream.forced = true;
      tracks[type].push(stream);
      scanMetadata(smatch.index);
      lastStream = stream;
      lastIndex = smatch.index;
    }
    scanMetadata();

    assert(video.length, "No video tracks");
    return {duration, video, audio, subs};
  }
}

function remove(arr, value) {
  const index = arr.indexOf(value);
  if (index !== -1) {
    arr.splice(index, value);
  }
}

/** Manager of FFmpeg jobs. */
export class Pool {
  constructor() {
    this.workers = [];
  }

  spawnJob({params, onLog, MEMFS, WORKERFS}) {
    // Send/transfer only necessary data.
    let transfer = [];
    MEMFS = (MEMFS || []).map(function({name, data, keep}) {
      if (!keep) transfer.push(data.buffer);
      return {name, data};
    });
    const mounts = WORKERFS ? [{
      type: "WORKERFS",
      opts: {blobs: WORKERFS},
      mountpoint: WORKERFS_DIR,
    }] : [];
    let workers = this.workers;
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
              TOTAL_MEMORY: ENCODE_MEMORY,
              MEMFS,
              mounts,
            }, transfer);
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
          resolve(msg.data && msg.data.MEMFS);
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
    while (this.workers.length) {
      this.workers.shift().terminate();
    }
  }
}
