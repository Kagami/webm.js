/**
 * FFmpeg manager. Uses worker interface of ffmpeg.js.
 * @module webm/ffmpeg
 */

const workerUrl = require("file!ffmpeg.js/ffmpeg-worker-webm");

const worker = new Worker(workerUrl);

worker.onerror = function(e) {
  // TODO(Kagami): process it.
  console.error(e);
};

worker.onmessage = function() {
  // const msg = e.data;
};
