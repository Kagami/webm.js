/**
 * Input file viewer.
 * @module webm/info/view
 */

import React from "react";
import {showTime} from "../ffmpeg";
import {FlatButton, Slider, boxHeight, boxAspect} from "../theme";

export default React.createClass({
  getInitialState: function() {
    return {frame: 1};
  },
  componentDidMount: function() {
    this.decodeFrame(this.state.frame);
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
      padding: "5px 0 5px 5px",
    },
    control: {
      marginRight: 5,
      minWidth: 50,
    },
    seekOuter: {
      display: "inline-block",
      padding: "0 15px",
    },
    seek: {
      display: "inline-block",
      margin: 0,
      width: 540,
      height: 16,
    },
    time: {
      display: "inline-block",
      width: 100,
      textAlign: "center",
      marginRight: 5,
      lineHeight: "24px",
      fontSize: "14px",
      color: "#ff4081",
      border: "1px solid #ff4081",
      boxSizing: "border-box",
      borderRadius: 5,
    },
  },
  getTrack: function() {
    // Use only first video track for now.
    return this.props.info.video[0];
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
  getTime: function(frame) {
    return (frame - 1) / this.getTrack().fps;
  },
  getTotalFrames: function() {
    return Math.ceil(this.props.info.duration * this.getTrack().fps);
  },
  isPrevDisabled: function() {
    return (
      this.state.frame <= 1 ||
      this.state.decodingFrame
    );
  },
  isNextDisabled: function() {
    return (
      this.state.frame >= this.getTotalFrames() - 1 ||
      this.state.decodingFrame
    );
  },
  decodeFrame: function(frame) {
    // FIXME(Kagami): Prefetching?
    this.setState({decodingFrame: true});
    const time = this.getTime(frame);
    this.props.prober.decode(this.props.source, time).then(frameObj => {
      const blob = new Blob([frameObj.data]);
      const frameUrl = URL.createObjectURL(blob);
      this.setState({frameUrl, decodingFrame: false});
    }).catch(e => {
      this.setState({decodingFrame: false});
      if (window.console) console.error(e);
    });
  },
  handlePrevClick: function() {
    const frame = this.state.frame - 1;
    this.setState({frame});
    this.decodeFrame(frame);
  },
  handleNextClick: function() {
    const frame = this.state.frame + 1;
    this.setState({frame});
    this.decodeFrame(frame);
  },
  handleSeekChange: function(e, frame) {
    this.setState({frame});
    if (this.state.draggingSeek) return;
    this.decodeFrame(frame);
  },
  handleSeekDragStart: function() {
    this.setState({draggingSeek: true});
  },
  handleSeekDragStop: function() {
    this.setState({draggingSeek: false});
    this.decodeFrame(this.state.frame);
  },
  handleCutStartClick: function() {
    const time = this.getTime(this.state.frame).toFixed(3);
    this.props.onParams({start: time});
  },
  handleCutEndClick: function() {
    const time = this.getTime(this.state.frame).toFixed(3);
    this.props.onParams({duration: time, useEndTime: true});
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
          <FlatButton
            primary
            style={this.styles.control}
            label="⧏"
            title="Mark start"
            onClick={this.handleCutStartClick}
            />
          <code style={this.styles.time}>
            {showTime(this.getTime(this.state.frame), {fixed: true})}
          </code>
          <FlatButton
            primary
            style={this.styles.control}
            label="⧐"
            title="Mark end"
            onClick={this.handleCutEndClick}
            />
          <div style={this.styles.seekOuter}>
            <Slider
              ref="seek"
              name="seek"
              value={this.state.frame}
              defaultValue={1}
              min={1}
              step={1}
              max={this.getTotalFrames() - 1}
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
