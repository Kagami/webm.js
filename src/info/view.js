/**
 * Input file viewer.
 * @module webm/info/view
 */

import React from "react";
import {FlatButton, Slider, boxHeight} from "../theme";

export default React.createClass({
  styles: {
    root: {
      borderBottom: "1px solid #e0e0e0",
    },
    view: {
      height: boxHeight,
      backgroundColor: "#000",
    },
    controls: {
      padding: 5,
    },
    control: {
      minWidth: 50,
    },
    seekOuter: {
      display: "inline-block",
      padding: "0 15px",
    },
    seek: {
      display: "inline-block",
      margin: 0,
      width: 770,
      height: 16,
    },
  },
  render: function() {
    // TODO(Kagami): Use icons.
    return (
      <div style={this.styles.root}>
        <div style={this.styles.view} />
        <div style={this.styles.controls}>
          <FlatButton
            style={this.styles.control}
            label="◄"
            title="Previous frame"
            disabled
            />
          <FlatButton
            style={this.styles.control}
            label="►"
            title="Next frame"
          />
          <div style={this.styles.seekOuter}>
            <Slider style={this.styles.seek} name="seek" />
          </div>
          <FlatButton
            primary
            label="⏏"
            title="Back"
            style={this.styles.control}
            onClick={this.props.onClear}
          />
        </div>
      </div>
    );
  },
});
