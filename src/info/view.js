/**
 * Input file viewer.
 * @module webm/info/view
 */

import React from "react";
import {parseTime, showTime} from "../ffmpeg";
import {FlatButton, Slider, boxHeight, boxAspect} from "../theme";
import {tryRun} from "../util";

export default React.createClass({
  getInitialState: function() {
    return {frame: 1};
  },
  componentWillMount: function() {
    this.setTime(this.state.frame);
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
      width: 600,
      height: 16,
    },
    time: {
      display: "inline-block",
      width: 100,
      textAlign: "center",
      marginRight: 5,
      lineHeight: "24px",
      fontSize: "14px",
      borderWidth: 1,
      borderStyle: "solid",
      boxSizing: "border-box",
      borderRadius: 5,
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
  getTimeStyle: function() {
    let style = Object.assign({}, this.styles.time);
    style.color = this.state.validTime ? "#ff4081" : "#f00";
    style.borderColor = this.state.validTime ? "#dcdad5" : "#f00";
    return style;
  },
  getTrack: function() {
    // Use only first video track for now.
    return this.props.info.video[0];
  },
  getFPS: function() {
    return this.getTrack().fps;
  },
  getTime: function(frame) {
    const time = (frame - 1) / this.getFPS();
    return Number(time.toFixed(3));
  },
  getFrame: function(prettyTime) {
    const time = parseTime(prettyTime);
    return Math.floor(time * this.getFPS()) + 1;
  },
  getTotalFrames: function() {
    // TODO(Kagami): This is _not_ accurate. We need to somehow parse
    // real frame boundaries. Use ffprobe to analyze video info?
    return Math.ceil(this.props.info.duration * this.getFPS());
  },
  setTime: function(frame) {
    const prettyTime = showTime(this.getTime(frame), {fixed: true});
    const validTime = true;
    this.setState({prettyTime, validTime});
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
  handlePlayClick: function() {
  },
  handleTimeChange: function(e) {
    const prettyTime = e.target.value;
    const time = tryRun(parseTime, prettyTime);
    const validTime = time != null && time < this.props.info.duration;
    this.setState({prettyTime, validTime});
  },
  handleTimeKey: function(e) {
    if (e.key === "q" || e.key === "w") e.preventDefault();
    if (this.state.decodingFrame) return;

    const smallShift = 1;                           // 1frame
    const bigShift = 1 * Math.ceil(this.getFPS());  // 1s
    let frame;

    switch (e.key) {
    case "q":
      frame = Math.max(1, this.state.frame - smallShift);
      this.setState({frame});
      this.setTime(frame);
      this.decodeFrame(frame);
      break;
    case "w":
      frame = Math.min(this.state.frame + smallShift, this.getTotalFrames());
      this.setState({frame});
      this.setTime(frame);
      this.decodeFrame(frame);
      break;
    case "ArrowUp":
      frame = Math.min(this.state.frame + bigShift, this.getTotalFrames());
      this.setState({frame});
      this.setTime(frame);
      this.decodeFrame(frame);
      break;
    case "ArrowDown":
      frame = Math.max(1, this.state.frame - bigShift);
      this.setState({frame});
      this.setTime(frame);
      this.decodeFrame(frame);
      break;
    case "Enter":
      if (this.state.validTime) {
        frame = this.getFrame(this.state.prettyTime);
        this.setState({frame});
        this.setTime(frame);
        this.decodeFrame(frame);
      }
      break;
    }
  },
  handleCutStartClick: function() {
    const time = this.getTime(this.state.frame);
    this.props.onParams({start: time});
  },
  handleCutEndClick: function() {
    const time = this.getTime(this.state.frame);
    this.props.onParams({duration: time, useEndTime: true});
  },
  handleSeekChange: function(e, frame) {
    this.setState({frame});
    this.setTime(frame);
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
            label="▶"
            title="Play/pause"
            onClick={this.handlePlayClick}
            disabled
            />
          <FlatButton
            primary
            style={this.styles.control}
            label="⧏"
            title="Mark start"
            onClick={this.handleCutStartClick}
            />
          <input
            title="Use Q/W/Up/Down/Enter to adjust seek position"
            style={this.getTimeStyle()}
            maxLength={10}
            value={this.state.prettyTime}
            onChange={this.handleTimeChange}
            onKeyDown={this.handleTimeKey}
          />
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
              max={this.getTotalFrames()}
              style={this.styles.seek}
              onChange={this.handleSeekChange}
              onDragStart={this.handleSeekDragStart}
              onDragStop={this.handleSeekDragStop}
            />
          </div>
          <FlatButton
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
