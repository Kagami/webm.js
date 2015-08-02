/**
 * Encoder main module.
 * @module webm/encode
 */

import React from "react";
import {Paper, RaisedButton, LinearProgress, ClearFix} from "material-ui";
import {Pool} from "../ffmpeg";
import Logger from "./logger";
import {ShowHide, ahas, getopt, clearopt, fixopt} from "../util";

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
  left: {
    float: "left",
    width: "50%",
  },
  right: {
    float: "left",
    width: "50%",
    textAlign: "right",
  },
  bigButton: {
    width: 450,
    marginBottom: 10,
  },
};

export default React.createClass({
  getInitialState: function() {
    const logShown = window.localStorage ? !!localStorage.SHOW_LOG : false;
    return {logShown};
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
    const audio = !ahas(params, "-an");
    let vthreads = +getopt(params, "-threads");
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
      log("main", "# " + line);
    }
    function getCmd(opts) {
      return "$ ffmpeg " + opts.join(" ");
    }

    addLog("main");
    logMain("Spawning jobs:");
    let jobs = [];

    logMain("  " + vthreads + " video thread(s)");
    for (let i = 0; i < vthreads; ++i) {
      const key = "video " + (i + 1);
      addLog(key);
      log(key, getCmd(videoParams1));
      jobs.push(pool.spawnJob(videoParams1).then(() => {
        logMain(key + " finished first pass");
        log(key, getCmd(videoParams2));
        // FIXME(Kagami): Pass logfile from the first pass.
        return pool.spawnJob(videoParams2);
      }).then(() => {
        logMain(key + " finished second pass");
        // FIXME(Kagami): Pass the output to muxer.
      }));
    }

    if (audio) {
      logMain("  1 audio thread");
      addLog("audio");
      log("audio", getCmd(audioParams));
      jobs.push(pool.spawnJob(audioParams).then(() => {
        logMain("audio finished");
        // FIXME(Kagami): Pass the output to muxer.
      }));
    }

    Promise.all(jobs).then(() => {
      logMain("Muxing parts");
      // FIXME(Kagami): Mux resulting data.
    }).then(() => {
      // Success.
      logMain("All is done");
    }, () => {
      // FIXME(Kagami): Process error, print detail error in log.
      this.state.pool.destroy();
    });
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
    params = params.concat("-pass", "2");
    return params;
  },
  getAudioParams: function(params) {
    params = params.concat("-vn");
    return params;
  },
  handleCancelClick: function() {
    this.props.onCancel();
  },
  handleLogClick: function() {
    this.setState({logShown: !this.state.logShown});
  },
  render: function() {
    let logLabel = this.state.logShown ? "hide log" : "show log";
    return (
      <Paper>
        <div style={styles.header}>encoding {this.props.source.name}: 30%</div>
        <div style={styles.controls}>
          <LinearProgress
            mode="determinate"
            value={30}
            style={styles.progress}
          />
          <ClearFix>
            <div style={styles.left}>
              <RaisedButton
                primary
                onClick={this.handleCancelClick}
                style={styles.bigButton}
                label="stop encoding"
              />
              <RaisedButton
                onClick={this.handleLogClick}
                style={styles.bigButton}
                label={logLabel}
              />
            </div>
            <div style={styles.right}>
              <RaisedButton
                style={styles.bigButton}
                label="download"
                primary
                disabled
              />
              <RaisedButton
                style={styles.bigButton}
                label="preview"
                disabled
              />
            </div>
          </ClearFix>
          <ShowHide show={this.state.logShown} viaCSS>
            <Logger logs={this.state.logs} />
          </ShowHide>
        </div>
      </Paper>
    );
  },
});
