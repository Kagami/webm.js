/**
 * Analyze and inspect input file.
 * @module webm/info
 */

import React from "react";
import {showTime} from "../ffmpeg";
import {
  Paper, FlatButton, InlineButton, Wait, Section,
  ClearFix, secondaryColor,
} from "../theme";
import View from "./view";
import {ShowHide} from "../util";

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
  section: {
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
  infoLeft: {
    float: "left",
  },
  infoRight: {
    float: "right",
    width: 420,
  },
  left: {
    width: 100,
  },
  right: {
    color: secondaryColor,
    maxWidth: 350,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  error: {
    color: secondaryColor,
  },
};

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    this.props.prober.analyze(this.props.source).then(info => {
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
  getResInfo: function() {
    return this.state.info.video.map(t =>
      t.width + "x" + t.height + "@" + t.fps
    ).join(", ");
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
  getErrorInnerNode: function() {
    const error = this.state.error;
    return error ? (
      <Section header="unsupported video" sectionStyle={styles.section}>
        <span>Metadata parser failed with the following error: </span>
        <span style={styles.error}>{error.message}</span><br />
        <span>If you think your video is fine, please open issue with the log
        attached at </span>
        <a href="https://github.com/Kagami/webm.js/issues">bugtracker</a>.
        <span> Or </span>
        <InlineButton primary label="go back" onClick={this.props.onClear} />.
      </Section>
    ) : null;
  },
  getInfoInnerNode: function() {
    const source = this.props.source;
    const info = this.state.info;
    return info ? (
      <Section header="input video info" sectionStyle={styles.section}>
        <ClearFix>
          <table style={styles.infoLeft}>
            <tr>
              <td style={styles.left}>Name:</td>
              <td style={styles.right} title={source.origName}>
                {source.origName}
              </td>
            </tr>
            <tr>
              <td style={styles.left}>Duration:</td>
              <td style={styles.right}>{showTime(info.duration)}</td>
            </tr>
            <tr>
              <td style={styles.left}>Resolution:</td>
              <td style={styles.right}>{this.getResInfo()}</td>
            </tr>
          </table>
          <table style={styles.infoRight}>
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
        </ClearFix>
      </Section>
    ) : null;
  },
  handleMoreClick: function() {
    this.setState({logShown: !this.state.logShown});
  },
  render: function() {
    const preload = (
      <div style={styles.preload}><Wait>Gathering file info</Wait></div>
    );
    const view = (
      <View
        prober={this.props.prober}
        source={this.props.source}
        info={this.state.info}
        onClear={this.props.onClear}
        onParams={this.props.onParams}
      />
    );
    const info = (
      <div>
        <div style={styles.info}>
          {this.getErrorInnerNode()}
          {this.getInfoInnerNode()}
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
        {this.state.info ? view : null}
        {this.state.info || this.state.error ? info : preload}
      </Paper>
    );
  },
});
