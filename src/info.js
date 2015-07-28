/**
 * Gather the file info using ffmpeg.
 * @module webm/info
 */

import React from "react";
import {Paper, IconButton} from "material-ui";
import {Wait, secondaryColor} from "./theme";

const styles = {
  root: {
    position: "relative",
  },
  preload: {
    padding: 8,
    textAlign: "center",
  },
  header: {
    padding: 8,
    color: "#e0e0e0",
    fontWeight: 500,
    fontSize: "18px",
  },
  info: {
    padding: 16,
    lineHeight: "36px",
  },
  // TODO(Kagami): Use material UI icons?
  more: {
    position: "absolute",
    bottom: 0,
    right: 0,
    color: secondaryColor,
    fontSize: "24px",
  },
  log: {
    margin: 0,
    padding: 16,
    backgroundColor: "#f8f8f8",
  },
};

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    setTimeout(() => {
      this.setState({info: {log: "10000000000000\n234234234234\n2342423"}});
    }, 1000);
  },
  handleMoreClick: function() {
    this.setState({logOpen: !this.state.logOpen});
  },
  render: function() {
    const preload = (
      <div style={styles.preload}><Wait>Gathering file info</Wait></div>
    );
    // TODO(Kagami): Display command as well?
    const logText = this.state.info && this.state.info.log;
    const log = <pre style={styles.log}>{logText}</pre>;
    const info = (
      <div>
        <div style={styles.header}>INFO</div>
        <div style={styles.info}>
          <div>VIDEO:</div>
          <div>AUDIO:</div>
          <div>SUBTITLES:</div>
        </div>
        {this.state.logOpen ? log : ""}
        <IconButton
          style={styles.more}
          tooltip="Show/hide full log"
          onClick={this.handleMoreClick}
        >
          {this.state.logOpen ? "⌃" : "⌄"}
        </IconButton>
      </div>
    );
    return (
      <Paper style={styles.root}>{this.state.info ? info : preload}</Paper>
    );
  },
});
