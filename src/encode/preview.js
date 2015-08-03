/**
 * Encode result preview window.
 * Very similar to mUI's Dialog, but simpler.
 * @module webm/encode/preview
 */

import React from "react";

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  styles: {
    outer: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: "1000",
      display: "table",
    },
    inner: {
      display: "table-cell",
      verticalAlign: "middle",
      textAlign: "center",
    },
    video: {
      background: "#555",
      padding: 8,
      display: "inline-block",
    },
  },
  show: function() {
    this.setState({open: true});
  },
  handleOuterClick: function() {
    this.setState({open: false});
  },
  handleVideoClick: function(e) {
    e.stopPropagation();
  },
  render: function() {
    return this.state.open ? (
      <div style={this.styles.outer} onClick={this.handleOuterClick}>
        <div style={this.styles.inner}>
          <video
            onClick={this.handleVideoClick}
            style={this.styles.video}
            src={this.props.url}
            controls
            autoPlay
          />
        </div>
      </div>
    ) : null;
  },
});
