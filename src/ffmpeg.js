/**
 * FFmpeg wrapper. Manage pool of ffmpeg.js workers and provide
 * high-level Promise API on top of it.
 * @module webm/ffmpeg
 */
// TODO(Kagami): Move this helpers to the ffmpeg.js?
// TODO(Kagami): Use IDBFS for large files.
// TODO(Kagami): Leverage Transferable Objects.

const WORKER_URL = require(
  "file?name=[hash:10].[name].[ext]!" +
  "ffmpeg.js/ffmpeg-worker-webm"
);

export class Prober {
  static spawn() {
    const worker = new Worker(WORKER_URL);
    return new Promise(function(resolve, reject) {
      worker.onmessage = function(e) {
        delete worker.onmessage;
        delete worker.onerror;
        const msg = e.data || {};
        if (msg.type === "ready") {
          resolve(new Prober(worker));
        } else {
          reject(new Error("Bad message from worker: " + msg));
        }
      };
      worker.onerror = function(e) {
        delete worker.onmessage;
        delete worker.onerror;
        reject(e);
      };
    });
  }

  constructor(worker) {
    this.worker = worker;
  }

  probe({file}) {
    return Promise.resolve(file);
  }
}
