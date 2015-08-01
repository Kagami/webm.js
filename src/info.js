/**
 * Gather the file info using ffmpeg.
 * @module webm/info
 */

import React from "react";
import {Paper, FlatButton} from "material-ui";
import {Wait} from "./theme";

const styles = {
  root: {
    marginBottom: 10,
  },
  info: {
    position: "relative",
  },
  preload: {
    padding: 8,
    textAlign: "center",
  },
  header: {
    paddingTop: 8,
    paddingLeft: 8,
    color: "#e0e0e0",
    fontWeight: 500,
    fontSize: "18px",
    textTransform: "uppercase",
  },
  infoInner: {
    padding: "16px 24px",
    lineHeight: "24px",
  },
  more: {
    width: 110,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 0,
  },
  log: {
    padding: "16px 24px",
    backgroundColor: "#f8f8f8",
  },
  logInner: {
    margin: 0,
    maxHeight: 300,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
};

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    this.props.prober.run(this.props.source).then(info => {
      this.setState({info});
      this.props.onLoad(info);
    }, (error) => {
      this.setState({error});
    });
  },
  getLogText: function() {
    return this.state.info ?
           this.state.info.log :
           this.state.error ? this.state.error.log : null;
  },
  handleMoreClick: function() {
    this.setState({logOpen: !this.state.logOpen});
  },
  render: function() {
    const preload = (
      <div style={styles.preload}><Wait>Gathering file info</Wait></div>
    );
    const infoInner = (
      <div>
        <div style={styles.header}>input video info</div>
        <div style={styles.infoInner}>
          <div>Duration:</div>
          <div>Video:</div>
          <div>Audio:</div>
          <div>Subtitles:</div>
        </div>
      </div>
    );
    // TODO(Kagami): Require at least one video track.
    // TODO(Kagami): Process other types of errors (Worker, emscripten,
    // FFmpeg, etc) as well. Though they should be uncommon.
    const errorInner = (
      <div>
        <div style={styles.header}>unsupported video</div>
        <div style={styles.infoInner}>
          <span>Selected video is either corrupted or unsupported.<br/>
          If you think your video is fine, please open issue with the log
          attached at </span>
          <a href="https://github.com/Kagami/webm.js/issues">bugtracker</a>.
        </div>
      </div>
    );
    const log = (
      <div style={styles.log}>
        <pre style={styles.logInner}>{this.getLogText()}</pre>
      </div>
    );
    const info = (
      <div>
        <div style={styles.info}>
          {this.state.error ? errorInner : infoInner}
          <FlatButton
            primary
            style={styles.more}
            onClick={this.handleMoreClick}
            label={this.state.logOpen ? "hide" : "log"}
          />
        </div>
        {this.state.logOpen ? log : null}
      </div>
    );
    return (
      <Paper style={styles.root}>
        {this.state.info || this.state.error ? info : preload}
      </Paper>
    );
  },
});
