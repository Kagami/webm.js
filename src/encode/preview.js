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
  componentDidMount: function() {
    document.addEventListener("keydown", this.handleKeyDown, false);
  },
  componentWillUnmount: function() {
    document.removeEventListener("keydown", this.handleKeyDown, false);
  },
  KEY_ESC: 27,
  styles: {
    outer: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: "1000",
      display: "table",
      backgroundColor: "rgba(0,0,0,.7)",
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
  cssFixes: (function() {
    const body = document.body;
    let origOverflow;
    let origPadding;
    return {
      enable: function() {
        origOverflow = body.style.overflow;
        origPadding = body.style["padding-right"];
        const widthWithScroll = body.clientWidth;
        body.style.overflow = "hidden";
        const scrollWidth = body.clientWidth - widthWithScroll;
        body.style["padding-right"] = scrollWidth + "px";
      },
      disable: function() {
        body.style.overflow = origOverflow;
        body.style["padding-right"] = origPadding;
      },
    };
  })(),
  show: function() {
    if (this.state.open) return;
    this.cssFixes.enable();
    this.setState({open: true});
  },
  hide: function() {
    if (!this.state.open) return;
    this.cssFixes.disable();
    this.setState({open: false});
  },
  handleKeyDown: function(e) {
    if (e.which === this.KEY_ESC) this.hide();
  },
  handleVideoClick: function(e) {
    e.stopPropagation();
  },
  render: function() {
    return this.state.open ? (
      <div style={this.styles.outer} onClick={this.hide}>
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
