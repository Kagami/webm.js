/**
 * Input file viewer.
 * @module webm/info/view
 */

import React from "react";
import {FlatButton, Slider, boxHeight, boxAspect} from "../theme";

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    this.decodeFrame();
  },
  styles: {
    root: {
      borderBottom: "1px solid #e0e0e0",
    },
    view: {
      height: boxHeight,
      backgroundColor: "#000",
      textAlign: "center",
    },
    // See: <https://css-tricks.com/centering-in-the-unknown/>.
    ghost: {
      display: "inline-block",
      height: "100%",
      verticalAlign: "middle",
    },
    frame: {
      display: "inline-block",
      verticalAlign: "middle",
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
  getFrameStyle: function() {
    let style = Object.assign({}, this.styles.frame);
    // Use only first video track for now.
    const track = this.props.info.video[0];
    const videoAspect = track.width / track.height;
    if (videoAspect > boxAspect) {
      style.width = "100%";
    } else {
      style.height = "100%";
    }
    return style;
  },
  decodeFrame: function() {
    // FIXME(Kagami): Prefetching?
    // TODO(Kagami): Handle frame decode errors.
    this.props.prober.decode(this.props.source, 2).then(frame => {
      const blob = new Blob([frame.data]);
      const frameUrl = URL.createObjectURL(blob);
      this.setState({frameUrl});
    });
  },
  render: function() {
    // TODO(Kagami): Use icons.
    return (
      <div style={this.styles.root}>
        <div style={this.styles.view}>
          <div style={this.styles.ghost} />
          <img style={this.getFrameStyle()} src={this.state.frameUrl} />
        </div>
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
