/**
 * Select input file widget.
 * @module webm/source
 */

import React from "react";
import {InlineButton, Center, Wait, secondaryColor} from "../theme";

const SAMPLE_NAME = "ed.webm";
const SAMPLE_URL = require("file?name=[name].[ext]!./ed.webm");

const styles = {
  border: {
    boxSizing: "border-box",
    cursor: "pointer",
    border: "2px dashed #ccc",
    color: secondaryColor,
  },
  hidden: {
    display: "none",
  },
};

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  handleBoxClick: function() {
    React.findDOMNode(this.refs.file).click();
  },
  handleFile: function() {
    // TODO(Kagami): Show error for non-video files.
    const file = React.findDOMNode(this.refs.file).files[0];
    const name = file.name;
    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    // NOTE(Kagami): This should be reasonably fast (browser need to
    // read file from disk into memory) for <50M files so don't bother
    // displaying progress bar here.
    // TODO(Kagami): Use IndexedDB for large files.
    reader.readAsArrayBuffer(file);
    reader.onload = e => {
      this.props.onLoad({name, url, data: e.target.result});
    };
  },
  handleSampleClick: function() {
    // tmp
    // e.stopPropagation();
    this.setState({loadingSample: true});
    let req = new XMLHttpRequest();
    req.open("GET", SAMPLE_URL, true);
    req.responseType = "arraybuffer";
    req.onload = () => {
      if (req.status >= 200 && req.status < 400) {
        const name = SAMPLE_NAME;
        const data = req.response;
        this.props.onLoad({name, data, url: SAMPLE_URL});
      } else {
        // FIXME(Kagami): Display error in UI.
        this.setState({loadingSample: false});
      }
    };
    req.onerror = () => {
      // FIXME(Kagami): Display error in UI.
      this.setState({loadingSample: false});
    };
    req.send();
  },
  componentDidMount: function() {
    // tmp
    this.handleSampleClick();
  },
  render: function() {
    return this.state.loadingSample ? (
      <Center><Wait>Loading sample</Wait></Center>
    ) : (
      <Center style={styles.border} onClick={this.handleBoxClick}>
        <input
          type="file"
          style={styles.hidden}
          onChange={this.handleFile}
          ref="file"
        />
        <div>Click/drag your input video here</div>
        <span>or borrow a </span>
        <InlineButton
          primary
          onClick={this.handleSampleClick}
          label="sample video"
        />
      </Center>
    );
  },
});
