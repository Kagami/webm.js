/**
 * Gather the file info using ffmpeg.
 * @module webm/info
 */

import React from "react";
import {showTime} from "./ffmpeg";
import {Paper, FlatButton, Wait, secondaryColor} from "./theme";
import {ShowHide} from "./util";

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
    backgroundColor: "#f8f8f8",
    maxHeight: 300,
    overflowY: "auto",
  },
  logInner: {
    margin: "16px 24px",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
  left: {
    width: 100,
  },
  right: {
    color: secondaryColor,
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
      this.props.onError(error);
    });
  },
  getLogText: function() {
    return this.state.info ?
           this.state.info.log :
           this.state.error ? this.state.error.log : null;
  },
  getResInfo: function() {
    return this.state.info.video.map(t => t.width + "x" + t.height).join(", ");
  },
  getTracksInfo: function(type) {
    const tracks = this.state.info[type];
    let info = tracks.length + " track";
    if (tracks.length !== 1) info += "s";
    if (tracks.length) {
      info += " (";
      info += tracks.map(t => t.codec).join(", ");
      info += ")";
    }
    return info;
  },
  getInfoInnerNode: function() {
    const info = this.state.info;
    return info ? (
      <div>
        <div style={styles.header}>input video info</div>
        <div style={styles.infoInner}>
          <table>
            <tr>
              <td style={styles.left}>Duration:</td>
              <td style={styles.right}>{showTime(info.duration)}</td>
            </tr>
            <tr>
              <td style={styles.left}>Resolution:</td>
              <td style={styles.right}>{this.getResInfo()}</td>
            </tr>
            <tr>
              <td style={styles.left}>Video:</td>
              <td style={styles.right}>{this.getTracksInfo("video")}</td>
            </tr>
            <tr>
              <td style={styles.left}>Audio:</td>
              <td style={styles.right}>{this.getTracksInfo("audio")}</td>
            </tr>
            <tr>
              <td style={styles.left}>Subtitles:</td>
              <td style={styles.right}>{this.getTracksInfo("subs")}</td>
            </tr>
          </table>
        </div>
      </div>
    ) : null;
  },
  handleMoreClick: function() {
    this.setState({logShown: !this.state.logShown});
  },
  render: function() {
    const preload = (
      <div style={styles.preload}><Wait>Gathering file info</Wait></div>
    );
    // TODO(Kagami): Require at least one video track.
    // TODO(Kagami): Process other types of errors (Worker, emscripten,
    // FFmpeg, etc) as well. Though they should be uncommon.
    const errorInner = (
      <div>
        <div style={styles.header}>unsupported codec</div>
        <div style={styles.infoInner}>
          <span>Selected video is either corrupted or unsupported.<br/>
          If you think your video is fine, please open issue with the log
          attached at </span>
          <a href="https://github.com/Kagami/webm.js/issues">bugtracker</a>.
        </div>
      </div>
    );
    const info = (
      <div>
        <div style={styles.info}>
          {this.state.error ? errorInner : this.getInfoInnerNode()}
          <FlatButton
            primary
            style={styles.more}
            onClick={this.handleMoreClick}
            label={this.state.logShown ? "hide" : "log"}
          />
        </div>
        <ShowHide show={this.state.logShown}>
          <div style={styles.log}>
            <pre style={styles.logInner}>{this.getLogText()}</pre>
          </div>
        </ShowHide>
      </div>
    );
    return (
      <Paper style={styles.root}>
        {this.state.info || this.state.error ? info : preload}
      </Paper>
    );
  },
});
