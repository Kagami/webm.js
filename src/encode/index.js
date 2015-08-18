/**
 * Encoder main module.
 * @module webm/encode
 */

import React from "react";
import {Pool, parseTime, showTime} from "../ffmpeg";
import {Paper, RaisedButton, LinearProgress} from "../theme";
import Logger from "./logger";
import Preview from "./preview";
import Download from "./download";
import {
  ahas, getopt, clearopt, fixopt, range, str2ab,
  MIN_VTHREADS, MAX_VTHREADS, DEFAULT_VTHREADS,
  showSize, showNow,
} from "../util";

const styles = {
  header: {
    paddingTop: 8,
    paddingLeft: 8,
    color: "#e0e0e0",
    fontWeight: 500,
    fontSize: "18px",
    textTransform: "uppercase",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  progress: {
    margin: "4px 0 20px 0",
  },
  controls: {
    padding: "16px 24px",
  },
  buttons: {
    marginBottom: 10,
  },
  bigButton: {
    width: 298,
    marginRight: 9,
  },
  lastBigButton: {
    width: 298,
  },
};

function tryRun(fn, arg, def) {
  try {
    return fn(arg);
  } catch(e) {
    return def;
  }
}

function timer() {
  const start = new Date().getTime();
  return function() {
    const elapsed = (new Date().getTime() - start) / 1000;
    return showTime(elapsed);
  };
}

function basename(name) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = name.slice(dotIndex + 1);
    if (ext !== "webm") name = name.slice(0, dotIndex);
  }
  return name;
}

export default React.createClass({
  getInitialState: function() {
    return {progress: 0};
  },
  componentWillMount: function() {
    let pool = this.pool = new Pool();
    // NOTE(Kagami): We analyze various video/audio settings and create
    // jobs based on single options line passed from the `Params`
    // component. This is a bit hackish - better to use values of UI
    // widgets, but since we also support raw FFmpeg options it's the
    // only way to detect features of the new encoding.
    //
    // Current policy: users may type whatever they want in `rawArgs`
    // text field, but we don't guarantee the correct work in that case.
    // We either fix bad values or fail to proceed.
    const params = this.props.params;
    const burnSubs = /\bsubtitles=/.test(getopt(params, "-vf", ""));
    const audio = !ahas(params, "-an");
    let vthreads = +getopt(params, "-threads");
    if (!Number.isInteger(vthreads) ||
        vthreads < MIN_VTHREADS ||
        vthreads > MAX_VTHREADS) {
      vthreads = DEFAULT_VTHREADS;
    }
    // TODO(Kagami): Fail on/fix bad ranges.
    const induration = this.props.info.duration;
    const ss = tryRun(parseTime, getopt(params, "-ss"), 0);
    // NOTE(Kagami): We DO NOT support `-to` option in `rawArgs`.
    const outduration = tryRun(parseTime, getopt(params, "-t"), induration);
    // To have integral number of seconds in parts duration.
    if (vthreads > outduration) vthreads = Math.floor(outduration) || 1;
    const partduration = Math.floor(outduration / vthreads);
    const source = this.props.source;
    const subFont = this.props.subFont;
    const commonParams = this.getCommonParams(params);
    const videoParams1 = this.getVideoParamsPass1(commonParams);
    const videoParams2 = this.getVideoParamsPass2(commonParams);
    const audioParams = this.getAudioParams(commonParams);
    const muxerParams = this.getMuxerParams({audio});
    const concatList = this.getConcatList({vthreads});
    function getPartParams(partParams, n, pass) {
      const lastPart = n === vthreads;
      const partss = ss + partduration * (n - 1);
      const duration = lastPart
        ? outduration - partduration * (vthreads - 1)
        : partduration;
      // Beware that emscripten doesn't accept Number in arguments!
      partParams = fixopt(partParams, "-ss", partss + "", {insert: true});
      // Omit "-t" in last part if possible to protect ourself against
      // float rounding errors, etc.
      if (!lastPart || ahas(partParams, "-t")) {
        partParams = fixopt(partParams, "-t", duration + "", {append: true});
      }
      if (burnSubs) {
        // TODO(Kagami): Make it work in complex cases too: comma
        // escaping, not related to subs setpts filter, no setpts filter
        // before vf_subtitles, etc.
        partParams = fixopt(partParams, "-vf", vfilters => {
          return vfilters.split(/,/).map(filter => {
            const m = filter.match(/^setpts=PTS\+(\d+(\.\d+)?)\/TB$/);
            if (!m) return filter;
            const subDelay = Number(m[1]) + partduration * (n - 1);
            return "setpts=PTS+" + subDelay + "/TB";
          }).join(",");
        });
      }
      partParams = partParams.concat(pass === 1 ? "-" : n + ".webm");
      return partParams;
    }
    // Should be private for each ffmpeg run.
    function createFrameParser() {
      const frameRe = /^frame=\s*(\d+)\b/;
      let lastFrame = 0;
      return function(line) {
        const framem = line.match(frameRe);
        if (!framem) return 0;
        const frame = framem[1];
        const result = frame - lastFrame;
        lastFrame = frame;
        return result;
      };
    }
    // Updates summary information for all threads since each thread
    // owns its chunk and sum of frames in all chunks = total frames.
    const updateProgress = (() => {
      // TODO(Kagami): Calculate the exact number of frames in video
      // after first pass in case if fps in metadata was wrong?
      const VIDEO_FPS = this.props.info.video[0].fps;
      const VIDEO_FRAMES = Math.ceil(outduration * VIDEO_FPS);
      // Approximate correlations between various encoding stages.
      const AUDIO_PERCENT = audio ? 2 : 0;
      const MUXER_PERCENT = 1;
      const VIDEO_PERCENT = 100 - AUDIO_PERCENT - MUXER_PERCENT;
      const PASS1_COEFF = 0.4 * VIDEO_PERCENT;
      const PASS2_COEFF = 0.6 * VIDEO_PERCENT;
      let progress = 0;
      return (did, pass) => {
        if (did.frames) {
          let incr = did.frames / VIDEO_FRAMES;
          incr *= pass === 1 ? PASS1_COEFF : PASS2_COEFF;
          progress += incr;
          // console.log(
          //   `Did ${did.frames}/${VIDEO_FRAMES} frames in pass ${pass}, `+
          //   `incr: ${incr}, progress: ${progress}`
          // );
        } else if (did.audio) {
          progress += AUDIO_PERCENT;
        }
        progress = Math.min(progress, 100 - MUXER_PERCENT);
        this.setState({progress: Math.floor(progress)});
      };
    })();

    // Logging routines.
    let logsList = [];
    let logsHash = {};
    function addLog(key) {
      const item = {key, contents: ""};
      logsList.push(item);
      logsHash[key] = item;
    }
    // TODO(Kagami): Truncate large logs?
    // TODO(Kagami): Colorize logs with hljs or manually?
    const log = (key, line) => {
      logsHash[key].contents += line + "\n";
      this.setState({logs: logsList});
    };
    const mainKey = "Main log";
    function logMain(line) {
      log(mainKey, "[" + showNow() + "] " + line);
    }
    function getCmd(opts) {
      return "$ ffmpeg " + opts.join(" ");
    }

    const overallT = timer();
    let jobs = [];
    let pass2T;
    addLog(mainKey);
    logMain("Spawning jobs:");
    logMain("  " + vthreads + " video thread(s)");
    if (audio) logMain("  1 audio thread");
    range(vthreads, 1).forEach(i => {
      const pass1T = timer();
      const key = "Video " + i;
      addLog(key);
      let pass = 1;
      let frameParser = createFrameParser();
      function logThread(line) {
        log(key, line);
        const did = {frames: frameParser(line)};
        updateProgress(did, pass);
      }
      logMain(key + " started first pass");
      const partParams1 = getPartParams(videoParams1, i, pass);
      logThread(getCmd(partParams1));
      const job = pool.spawnJob({
        params: partParams1,
        onLog: logThread,
        WORKERFS: [subFont, source],
      }).then(files => {
        pass2T = timer();
        pass = 2;
        frameParser = createFrameParser();
        logMain(key + " finished first pass (" + pass1T() + ")");
        logMain(key + " started second pass");
        const partParams2 = getPartParams(videoParams2, i, pass);
        logThread(getCmd(partParams2));
        return pool.spawnJob({
          params: partParams2,
          onLog: logThread,
          MEMFS: files,
          WORKERFS: [subFont, source],
        });
      }).then(files => {
        logMain(key + " finished second pass (" + pass2T() + ")");
        return files[0];
      }).catch(e => {
        e.key = key;
        throw e;
      });
      jobs.push(job);
    });
    if (audio) {
      const key = "Audio";
      const logThread = log.bind(null, key);
      addLog(key);
      const audioT = timer();
      logMain(key + " started");
      logThread(getCmd(audioParams));
      const job = pool.spawnJob({
        params: audioParams,
        onLog: logThread,
        WORKERFS: [source],
      }).then(files => {
        logMain(key + " finished (" + audioT() + ")");
        updateProgress({audio: true});
        return files[0];
      }).catch(e => {
        e.key = key;
        throw e;
      });
      jobs.push(job);
    }
    const muxerKey = "Muxer";
    addLog(muxerKey);

    let muxerT;
    Promise.all(jobs).then(parts => {
      // TODO(Kagami): Skip this step if vthreads=1 and audio=false?
      muxerT = timer();
      logMain("Muxer started");
      const logThread = log.bind(null, muxerKey);
      logThread(getCmd(muxerParams));
      return pool.spawnJob({
        params: muxerParams,
        onLog: logThread,
        MEMFS: parts.concat(concatList),
      });
    }).then(files => {
      logMain("Muxer finished (" + muxerT() + ")");
      const output = files[0];
      log(mainKey, "==================================================");
      log(mainKey, "All is done in " + overallT());
      log(mainKey, "Output duration: " + showTime(outduration));
      log(mainKey, "Output file size: " + showSize(output.data.byteLength));
      log(mainKey, "Output video bitrate: " + getopt(params, "-b:v", "0"));
      log(mainKey, "Output audio bitrate: " + getopt(params, "-b:a", "0"));
      this.setState({output});
    }, e => {
      pool.destroy();
      let msg = "Fatal error";
      if (e.key) msg += " at " + e.key;
      msg += ": " + e.message;
      logMain(msg);
      this.setState({error: e});
    });
  },
  componentWillUnmount: function() {
    clearTimeout(this.timeout);
    this.pool.destroy();
  },
  /**
   * Return pretty filename based on the input video name.
   */
  getOutputFilename: function() {
    let name = basename(this.props.source.origName);
    const params = this.props.params;
    if (ahas(params, "-ss") || ahas(params, "-t")) {
      const induration = this.props.info.duration;
      const ss = tryRun(parseTime, getopt(params, "-ss"), 0);
      const outduration = tryRun(parseTime, getopt(params, "-t"), induration);
      name += "_";
      name += showTime(ss);
      name += "-";
      name += showTime(ss + outduration);
    }
    name += ".webm";
    return name;
  },
  getCommonParams: function(params) {
    params = clearopt(params, "-threads");
    params = ["-hide_banner"].concat(params);
    return params;
  },
  getVideoParamsPass1: function(params) {
    params = params.concat("-an");
    params = fixopt(params, "-speed", "4", {append: true});
    params = params.concat("-pass", "1", "-f", "null");
    return params;
  },
  getVideoParamsPass2: function(params) {
    // Name should be calculated for each part separately.
    params = params.concat("-an", "-pass", "2");
    return params;
  },
  getAudioParams: function(params) {
    // Remove video-only options to avoid warnings.
    params = clearopt(params, "-speed");
    params = clearopt(params, "-auto-alt-ref");
    params = clearopt(params, "-lag-in-frames");
    params = params.concat("-vn", "audio.webm");
    return params;
  },
  getMuxerParams: function({audio}) {
    let params = ["-hide_banner", "-f", "concat", "-i", "list.txt"];
    if (audio) params = params.concat("-i", "audio.webm");
    params = params.concat("-c", "copy", "out.webm");
    return params;
  },
  getConcatList: function({vthreads}) {
    const list = range(vthreads, 1).map(i => {
      return "file '" + i + ".webm'";
    });
    return {
      name: "list.txt",
      data: str2ab(list.join("\n")),
    };
  },
  getCancelLabel: function() {
    return this.state.waitingConfirm
      ? "sure?"
      : (this.state.output || this.state.error) ? "back" : "cancel";
  },
  handleCancelClick: function() {
    if (this.state.waitingConfirm) return this.props.onCancel();
    this.setState({waitingConfirm: true});
    this.timeout = setTimeout(() => {
      this.setState({waitingConfirm: false});
    }, 1000);
  },
  handlePreviewClick: function() {
    this.refs.preview.show();
  },
  render: function() {
    const done = !!this.state.output;
    const error = !!this.state.error;
    const progress = done ? 100 : error ? 0 : this.state.progress;
    const outname = this.getOutputFilename();
    let header = "encoding " + outname + ": ";
    let url;
    if (error) {
      header = "encoding error";
    } else if (done) {
      header += "done";
      const blob = new Blob([this.state.output.data]);
      url = URL.createObjectURL(blob);
    } else {
      header += progress + "%";
    }
    return (
      <Paper>
        <div style={styles.header}>{header}</div>
        <div style={styles.controls}>
          <LinearProgress
            mode="determinate"
            value={progress}
            style={styles.progress}
          />
          <div style={styles.buttons}>
            <RaisedButton
              style={styles.bigButton}
              primary={!done}
              label={this.getCancelLabel()}
              onClick={this.handleCancelClick}
            />
            <Download
              url={url}
              name={outname}
              disabled={!done}
              primary
              style={styles.bigButton}
              label="download"
            />
            <RaisedButton
              style={styles.lastBigButton}
              secondary
              disabled={!done}
              label="preview"
              onClick={this.handlePreviewClick}
            />
            <Preview ref="preview" url={url} />
          </div>
          <Logger logs={this.state.logs} />
        </div>
      </Paper>
    );
  },
});
