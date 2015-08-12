/**
 * Select input file widget.
 * @module webm/source
 */

import React from "react";
import {
  InlineButton, Center, Wait, CenterSection, secondaryColor,
} from "../theme";
import {download} from "../util";

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
  componentDidMount: function() {
    if (window.localStorage && localStorage.SKIP_SOURCE) {
      this.handleSampleClick();
    }
  },
  handleBoxClick: function() {
    React.findDOMNode(this.refs.file).click();
  },
  handleDragOver: function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  },
  handleDrop: function(e) {
    e.stopPropagation();
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) this.handleFile(files[0]);
  },
  handleInput: function() {
    const files = React.findDOMNode(this.refs.file).files;
    this.handleFile(files[0]);
  },
  handleFile: function(file) {
    // NOTE(Kagami): We can check for `file.type.match(/^video/)` here
    // but let's do the actual check with FFmpeg because browser may not
    // recognize some obscure format.
    const name = file.name;
    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    // TODO(Kagami): Implement WORKERFS, see
    // <https://github.com/kripken/emscripten/issues/3641>.
    reader.readAsArrayBuffer(file);
    reader.onload = e => {
      this.props.onLoad({name, url, data: e.target.result});
    };
  },
  handleSampleClick: function(e) {
    if (e) e.stopPropagation();
    this.setState({loadingSample: true, loadingError: false});
    download(SAMPLE_URL).then(data => {
      const name = SAMPLE_NAME;
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      this.props.onLoad({name, data, url});
    }).catch(() => {
      this.setState({loadingSample: false, loadingError: true});
    });
  },
  render: function() {
    return this.state.loadingError ? (
      <CenterSection header="loading error">
        <span>Error occured while downloading the sample, </span>
        <InlineButton
          primary
          onClick={this.handleSampleClick}
          label="try again"
        />.
      </CenterSection>
    ) : this.state.loadingSample ? (
      <Center><Wait>Loading sample</Wait></Center>
    ) : (
      <Center
        style={styles.border}
        onClick={this.handleBoxClick}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
      >
        <input
          type="file"
          style={styles.hidden}
          onChange={this.handleInput}
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
