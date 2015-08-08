/**
 * Encoder main module.
 * @module webm/encode
 */

import React from "react";
import {Pool, parseTime, showTime} from "../ffmpeg";
import {Paper, RaisedButton, LinearProgress} from "../theme";
import Logger from "./logger";
import Preview from "./preview";
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

function tryGet(fn, arg, def) {
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

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  componentWillMount: function() {
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
    const ss = tryGet(parseTime, getopt(params, "-ss"), 0);
    // NOTE(Kagami): We DO NOT support `-to` option in `rawArgs`.
    const outduration = tryGet(parseTime, getopt(params, "-t"), induration);
    // To have integral number of seconds in parts duration.
    if (vthreads > outduration) vthreads = Math.floor(outduration);
    const partduration = Math.floor(outduration / vthreads);
    const source = this.props.source;
    const subFont = this.props.subFont;
    const safeSource = {name: source.safeName, data: source.data, keep: true};
    const videoSources = burnSubs ? [safeSource, subFont] : [safeSource];
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
      // Try to omit "-t" in last part if possible to safe ourself
      // against float rounding errors, etc.
      if (!lastPart || ahas(partParams, "-t")) {
        partParams = fixopt(partParams, "-t", duration + "", {append: true});
      }
      if (burnSubs) {
        // TODO(Kagami): Make it work in complex cases too: comma
        // escaping, not related to subs setpts filter, no setpts filter
        // before vf_subtitles, etc.
        partParams = fixopt(partParams, "-vf", vfilters => {
          return vfilters.split(/,/).map(filter => {
            const m = filter.match(/^setpts=PTS+(\d+(\.\d+)?)\/TB$/);
            if (!m) return filter;
            const subDelay = m[1] + partduration * (n - 1);
            return "setpts=PTS+" + subDelay + "/TB";
          }).join(",");
        });
      }
      partParams = partParams.concat(pass === 1 ? "-" : n + ".webm");
      return partParams;
    }

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
    let pass2T;
    let pool = this.pool = new Pool();
    let jobs = [];
    addLog(mainKey);
    logMain("Spawning jobs:");
    logMain("  " + vthreads + " video thread(s)");
    if (audio) logMain("  1 audio thread");
    range(vthreads, 1).forEach(i => {
      const key = "Video " + i;
      const logThread = log.bind(null, key);
      addLog(key);
      const pass1T = timer();
      logMain(key + " started first pass");
      const partParams1 = getPartParams(videoParams1, i, 1);
      logThread(getCmd(partParams1));
      const job = pool.spawnJob({
        params: partParams1,
        onLog: logThread,
        files: videoSources,
      }).then(files => {
        logMain(key + " finished first pass (" + pass1T() + ")");
        pass2T = timer();
        logMain(key + " started second pass");
        const partParams2 = getPartParams(videoParams2, i, 2);
        logThread(getCmd(partParams2));
        return pool.spawnJob({
          params: partParams2,
          onLog: logThread,
          // Log and source for the second pass.
          files: videoSources.concat(files),
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
        files: [safeSource],
      }).then(files => {
        logMain(key + " finished (" + audioT() + ")");
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
        files: parts.concat(concatList),
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
   * in.mkv -> in.webm
   * in.webm -> in.webm.webm
   */
  getOutputFilename: function() {
    const name = this.props.source.name;
    let basename = name;
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex !== -1) {
      const ext = name.slice(dotIndex + 1);
      if (ext !== "webm") basename = name.slice(0, dotIndex);
    }
    // TODO(Kagami): Use ss/t times in name, see webm.py.
    return basename + ".webm";
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
    // FIXME(Kagami): Proper error handling.
    // FIXME(Kagami): Calculate progress.
    const error = !!this.state.error;
    const done = !!this.state.output;
    const progress = error ? 0 : (done ? 100 : 30); //tmp
    const outname = this.getOutputFilename();
    let header = "encoding " + outname + ": ";
    let url;
    if (error) {
      header = "error";
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
            <a href={url} download={outname}>
              <RaisedButton
                style={styles.bigButton}
                primary
                disabled={!done}
                label="download"
              />
            </a>
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
