<p align="center">
  <img src="https://raw.githubusercontent.com/Kagami/webm.js/master/src/index/logo.png">
</p>

<p align="center">
  Create WebM videos in your browser. No plugins or servers, pure JavaScript.
</p>

<p align="center">
  <a href="https://travis-ci.org/Kagami/webm.js"><img alt="Build Status" src="https://travis-ci.org/Kagami/webm.js.svg?branch=master"></a>
</p>

---

### What's this?

webm.js is a simple one-page application that allows you to convert videos to WebM format right into your browser, without any plugins or server-side involved. Since WebM is part of HTML5 stack, why can't we create one without leaving the browser?

### Is it fast?

Well, partly. Emscripten and asm.js produce code almost as fast as native, but JavaScript doesn't have access to advanced x86 instructions like SSE and codecs use them far and wide so we have some performance degradation here. Not that drastical though - I had numbers like 8x worse than native@corei7-avx for libvpx/vp8 and ~4 fps (single thread, SD, medium settings). Low-level multithreading is also [not available](https://github.com/kripken/emscripten/blob/master/site/source/docs/porting/pthreads.rst) in stable versions of browsers, but luckily we can hack it up by splitting video into chunks and encoding them in separate workers.

*Full-fledged benchmark here.*

### What about quality?

Currently only VP8+Opus combination is supported. Opus is better than Vorbis ([and almost any other lossy codec](http://opus-codec.org/comparison/quality.png)) for the full range of bitrates and blazingly fast. Unfortunately, due to lack of SIMD, VP9 encoding is rather impractical in browser and VP8 is significantly worse than VP9. Though [JavaScript SIMD API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SIMDA) is part of ES7 proposal and already supported by Firefox Nightly so I'm actively looking into this.

Trying to compensate the use of outdated codec, two-pass encoding with `speed=1` and `lag-in-frames=25` is used. Splitting video in parts creates additional keyframes and therefore loses effeciency a bit, but  the difference should be negligible for the `g=128` currently used. It is also possible to specify `speed=0` or `quality=best` and other FFmpeg/libvpx options if you're trying to achieve the maximum quality.

### Build

Build your own version of webm.js is as simple as clone the repo and run

```bash
npm i && npm run release
```

inside. Host the `dist` directory with your favourite HTTP server or use `npm start` to start the development server at 8080 port.

### License

webm.js own code, documentation, favicon and logo licensed under CC0, but the resulting build also includes the following libraries and assets:

* FFmpeg port [ffmpeg.js](https://github.com/Kagami/ffmpeg.js) (LGPL-2.1+ and few libraries under BSD, see [full text of license](https://github.com/Kagami/ffmpeg.js/blob/master/LICENSE))
* Remaining libraries in `dependencies` section of [package.json](https://github.com/Kagami/webm.js/blob/master/package.json) (BSD-like)
* [Roboto font](https://www.google.com/fonts/specimen/Roboto) by Christian Robertson (Apache License 2.0)
* Sample video is part of Elephants Dream movie ((c) copyright 2006, Blender Foundation / Netherlands Media Art Institute / www.elephantsdream.org)
* [GitHub Ribbon](https://github.com/blog/273-github-ribbons) (MIT)

---

webm.js - JavaScript WebM encoder

Written in 2015 by Kagami Hiiragi <kagami@genshiken.org>

To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.

You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
