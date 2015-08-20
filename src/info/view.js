/**
 * Input file viewer.
 * @module webm/info/view
 */

import React from "react";
import {FlatButton, Slider, boxHeight, boxAspect} from "../theme";

export default React.createClass({
  getInitialState: function() {
    return {seek: 0};
  },
  componentDidMount: function() {
    this.decodeFrame(this.state.seek);
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
    const track = this.getTrack();
    const videoAspect = track.width / track.height;
    if (videoAspect > boxAspect) {
      style.width = "100%";
    } else {
      style.height = "100%";
    }
    return style;
  },
  getTrack: function() {
    // Use only first video track for now.
    return this.props.info.video[0];
  },
  getStep: function() {
    return 1 / this.getTrack().fps;
  },
  getLastPTS: function() {
    const induration = this.props.info.duration;
    return induration - this.getStep();
  },
  isPrevDisabled: function() {
    return (
      this.state.seek <= 0 ||
      this.state.decodingFrame
    );
  },
  isNextDisabled: function() {
    return (
      this.state.seek >= this.getLastPTS() ||
      this.state.decodingFrame
    );
  },
  decodeFrame: function(seek) {
    // FIXME(Kagami): Prefetching?
    this.setState({decodingFrame: true});
    this.props.prober.decode(this.props.source, seek).then(frame => {
      const blob = new Blob([frame.data]);
      const frameUrl = URL.createObjectURL(blob);
      this.setState({frameUrl, decodingFrame: false});
    }).catch(e => {
      this.setState({decodingFrame: false});
      if (window.console) console.error(e);
    });
  },
  handlePrevClick: function() {
    let seek = this.state.seek - this.getStep();
    // Fix FP inaccuracy.
    if (seek < 0.001) seek = 0;
    this.setState({seek});
    this.decodeFrame(seek);
  },
  handleNextClick: function() {
    const seek = Math.min(this.state.seek + this.getStep(), this.getLastPTS());
    this.setState({seek});
    this.decodeFrame(seek);
  },
  handleSeekChange: function(e, seek) {
    this.setState({seek});
    if (this.state.draggingSeek) return;
    this.decodeFrame(seek);
  },
  handleSeekDragStart: function() {
    this.setState({draggingSeek: true});
  },
  handleSeekDragStop: function() {
    this.setState({draggingSeek: false});
    this.decodeFrame(this.state.seek);
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
            onClick={this.handlePrevClick}
            disabled={this.isPrevDisabled()}
            />
          <FlatButton
            style={this.styles.control}
            label="►"
            title="Next frame"
            onClick={this.handleNextClick}
            disabled={this.isNextDisabled()}
          />
          <div style={this.styles.seekOuter}>
            <Slider
              ref="seek"
              name="seek"
              value={this.state.seek}
              step={this.getStep()}
              max={this.getLastPTS()}
              style={this.styles.seek}
              onChange={this.handleSeekChange}
              onDragStart={this.handleSeekDragStart}
              onDragStop={this.handleSeekDragStop}
            />
          </div>
          <FlatButton
            primary
            label="⏏"
            title="Back"
            style={this.styles.control}
            onClick={this.props.onClear}
            disabled={this.state.decodingFrame}
          />
        </div>
      </div>
    );
  },
});
