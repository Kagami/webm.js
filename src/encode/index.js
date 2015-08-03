/**
 * Encoder main module.
 * @module webm/encode
 */

import React from "react";
import {Pool} from "../ffmpeg";
import {Paper, RaisedButton, LinearProgress} from "../theme";
import Logger from "./logger";
import Preview from "./preview";
import {clearopt, fixopt} from "../util";

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

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  componentWillMount: function() {
    let pool = new Pool();
    this.setState({pool});
    // XXX(Kagami): We analyze various video/audio settings and create
    // jobs based on single options line passed from the Params
    // component. This is a bit hackish - better to use values from UI
    // widgets, but since we also support raw FFmpeg options it's the
    // only way to detect features of the new encoding.
    const params = this.props.params;
    const audio = false; //!ahas(params, "-an");
    let vthreads = 1; //+getopt(params, "-threads");
    // FIXME(Kagami): Do not spawn more threads than number of seconds
    // in resulting video.
    if (!Number.isInteger(vthreads) || vthreads < 1 || vthreads > 8) {
      // We may raise an error here instead of fixing it.
      vthreads = this.getDefaultVideoThreads();
    }
    const commonParams = this.getCommonParams(params);
    const videoParams1 = this.getVideoParamsPass1(commonParams);
    const videoParams2 = this.getVideoParamsPass2(commonParams);
    const audioParams = this.getAudioParams(commonParams);

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
    function logMain(line) {
      log("Main log", "# " + line);
    }
    function getCmd(opts) {
      return "$ ffmpeg " + opts.join(" ");
    }

    const start = new Date().getTime();
    addLog("Main log");
    addLog("Muxer");
    logMain("Spawning jobs:");
    let jobs = [];

    logMain("  " + vthreads + " video thread(s)");
    for (let i = 1; i <= vthreads; ++i) {
      const key = "Video " + i;
      const logThread = log.bind(null, key);
      addLog(key);
      logMain(key + " started first pass");
      logThread(getCmd(videoParams1));
      const job = pool.spawnJob({
        params: videoParams1,
        onLog: logThread,
        // TODO(Kagami): Is it ok to pass Blob/File URL to work? Does it
        // cause additional memory consumption?
        files: [this.props.source],
      }).then(files => {
        logMain(key + " finished first pass");
        logMain(key + " started second pass");
        logThread(getCmd(videoParams2));
        return pool.spawnJob({
          params: videoParams2,
          onLog: logThread,
          // Log and source for the second pass.
          files: files.concat(this.props.source),
        });
      }).then(files => {
        logMain(key + " finished second pass");
        return files[0];
      }).catch(e => {
        e.key = key;
        throw e;
      });
      jobs.push(job);
    }

    if (audio) {
      logMain("  1 audio thread");
      const key = "Audio";
      const logThread = log.bind(null, key);
      addLog(key);
      logMain(key + " started");
      logThread(getCmd(audioParams));
      const job = pool.spawnJob({
        params: audioParams,
        onLog: logThread,
        files: [this.props.source],
      }).then(files => {
        logMain(key + " finished");
        return files[0];
      }).catch(e => {
        e.key = key;
        throw e;
      });
      jobs.push(job);
    }

    const cleanup = pool.destroy.bind(pool);
    Promise.all(jobs).then(parts => {
      logMain("Muxing parts");
      // FIXME(Kagami): Mux parts.
      return parts[0];
    }).then(output => {
      let elapsed = new Date().getTime() - start;
      // TODO(Kagami): Print pretty timestamp.
      elapsed /= 1000;
      logMain("All is done in " + elapsed + " seconds");
      this.setState({output});
    }, e => {
      let msg = "Fatal error";
      if (e.key) msg += " at " + e.key;
      msg += ": " + e.message;
      logMain(msg);
      this.setState({error: e});
    }).then(cleanup, cleanup);
  },
  componentWillUnmount: function() {
    this.state.pool.destroy();
  },
  getDefaultVideoThreads: function() {
    let threadNum = navigator.hardwareConcurrency || 4;
    // Navigator will contain number of cores including HT, e.g. 8 for a
    // CPU with 4 physical cores. This would be too much given the
    // memory consumption, additional audio thread, etc.
    if (threadNum > 4) threadNum = 4;
    return threadNum;
  },
  /**
   * Return pretty filename based on the input video name.
   * in.mkv -> in.webm
   * in.webm -> in.webm.webm
   */
  getOutputFilename: function() {
    let basename = this.props.source.name;
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
    // NOTE(Kagami): First pass will use default `-speed` value if it's
    // omitted in params. This may be considered as feature.
    params = fixopt(params, "-speed", "4");
    params = params.concat("-pass", "1", "-f", "null", "-");
    return params;
  },
  getVideoParamsPass2: function(params) {
    params = params.concat("-an");
    params = params.concat("-pass", "2", this.getOutputFilename());
    return params;
  },
  getAudioParams: function(params) {
    params = params.concat("-vn");
    return params;
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
              label={done ? "back" : "cancel"}
              // TODO(Kagami): Confirm action.
              onClick={this.props.onCancel}
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
