/**
 * Input file viewer.
 * @module webm/info/view
 */

import React from "react";
import {parseTime, showTime} from "../ffmpeg";
import {FlatButton, Slider, boxHeight, boxAspect} from "../theme";
import {tryRun} from "../util";

function getSparseLength(arr) {
  let len = 0;
  arr.forEach(() => len++);
  return len;
}

function createFrameCacher(totalFrames) {
  const MAX_CACHE_SIZE = 200;
  const FRAME_PREFETCH_COUNT = 30;
  const FRAME_RESERVE_COUNT = 30;

  // Use 1-based indexes for convenience.
  let cache = Array(totalFrames + 1);

  return {
    get: function(neededFrame) {
      const frameUrl = cache[neededFrame];

      let frame = neededFrame;
      let reserve = 0;
      while (
        frame <= totalFrames &&
        reserve <= FRAME_RESERVE_COUNT &&
        cache[frame++]
      ) reserve++;

      if (reserve > FRAME_RESERVE_COUNT ||
          reserve > totalFrames - neededFrame) {
        return {frameUrl, count: 0};
      }

      const count = Math.min(FRAME_PREFETCH_COUNT, totalFrames - neededFrame);
      const fetchedFrame = neededFrame + reserve;
      return {frameUrl, fetchedFrame, count};
    },
    setMany: function(neededFrame, fetchedFrame, files) {
      if (getSparseLength(cache) > MAX_CACHE_SIZE) {
        let newCache = Array(totalFrames + 1);
        // Keep prefetched frames of old cache near the current pos.
        for (let frame = neededFrame; frame < fetchedFrame; frame++) {
          newCache[frame] = cache[frame];
        }
        cache = newCache;
      }
      files.forEach(function(frameObj, i) {
        const blob = new Blob([frameObj.data]);
        const frameUrl = URL.createObjectURL(blob);
        cache[fetchedFrame + i] = frameUrl;
      });
      return cache[neededFrame];
    },
  };
}

const requestAnimFrame = (
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame
);

const cancelAnimFrame = (
  window.cancelAnimationFrame ||
  window.webkitCancelAnimationFrame ||
  window.mozCancelAnimationFrame ||
  window.oCancelAnimationFrame ||
  window.msCancelAnimationFrame
);

export default React.createClass({
  getInitialState: function() {
    this.playRID = null;
    this.lastFrameTime = 0.0;
    this.minFrameDelay = 1000 / this.PLAY_FPS;
    return {frame: 0};
  },
  componentWillMount: function() {
    this.frameCacher = createFrameCacher(this.getTotalFrames());
    // Emulate valid time for first frame.
    this.setTime(1);
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
      height: 13,
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
      outline: "none",
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
    style.borderColor = this.state.validTime
      ? (this.state.focusedTime ? "#ff4081" : "#dcdad5")
      : "#f00";
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
  focusTime: function() {
    React.findDOMNode(this.refs.time).focus();
  },
  decodeFrame: function(neededFrame) {
    let {frameUrl, fetchedFrame, count} = this.frameCacher.get(neededFrame);
    if (frameUrl) {
      this.setState({frameUrl});
    } else if (count) {
      // console.log("+++ BLOCKED");
      this.setState({blockingDecode: true});
    }
    if (this.state.decodingFrame || !count) return;

    // console.log(
    //   `Needed ${neededFrame}, fetching ${count} frames ` +
    //   `starting with ${fetchedFrame}`
    // );

    this.setState({decodingFrame: true});
    const source = this.props.source;
    const time = this.getTime(fetchedFrame);
    this.props.prober.decode({source, count, time}).then(files => {
      const url = this.frameCacher.setMany(neededFrame, fetchedFrame, files);
      // if (this.state.blockingDecode) console.log("--- UNBLOCKED");
      this.setState({decodingFrame: false, blockingDecode: false});
      if (!frameUrl) this.setState({frameUrl: url});
    }).catch(e => {
      if (window.console) console.error(e);
      this.setState({frameUrl, decodingFrame: false, blockingDecode: false});
    });
  },
  // TODO(Kagami): We do not support realtime playing in current
  // implementation because it's too slow. Better implementation would
  // require full-featured media player port.
  PLAY_FPS: 15,
  playFrame: function(now) {
    const delta = now - this.lastFrameTime;
    if (delta >= this.minFrameDelay && !this.state.blockingDecode) {
      // See <http://codetheory.in/controlling-the-frame-rate> for
      // details.
      this.lastFrameTime = now - (delta % this.minFrameDelay);
      const frame = this.state.frame + 1;
      if (frame > this.getTotalFrames()) {
        return this.setState({playing: false});
      }
      this.setState({frame});
      this.setTime(frame);
      this.decodeFrame(frame);
    }
    this.playRID = requestAnimFrame(this.playFrame);
  },
  isPlayDisabled: function() {
    return !this.state.playing && (
      this.state.decodingFrame ||
      this.state.frame >= this.getTotalFrames()
    );
  },
  pauseActivity: function() {
    cancelAnimFrame(this.playRID);
    this.setState({playing: false});
  },
  handlePlayClick: function() {
    if (this.isPlayDisabled()) return;
    const playing = !this.state.playing;
    this.setState({playing});
    if (playing) {
      this.playRID = requestAnimFrame(this.playFrame);
    } else {
      cancelAnimFrame(this.playRID);
    }
  },
  handleTimeChange: function(e) {
    const prettyTime = e.target.value;
    const time = tryRun(parseTime, prettyTime);
    const validTime = time != null && time < this.props.info.duration;
    this.setState({prettyTime, validTime});
  },
  handleTimeKey: function(e) {
    if (e.key === "q" || e.key === "w" || e.key === " ") e.preventDefault();
    if (e.key === " ") return this.handlePlayClick();
    if (this.state.blockingDecode || this.state.playing) return null;

    const smallShift = 1;                           // 1frame
    const bigShift = 1 * Math.ceil(this.getFPS());  // 1s
    let frame;

    // TODO(Kagami): What browsers don't support KeyboardEvent.key?
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
  handleTimeFocus: function() {
    this.setState({focusedTime: true});
  },
  handleTimeBlur: function() {
    this.setState({focusedTime: false});
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
    frame = Math.max(1, frame);
    this.setState({frame});
    this.setTime(frame);
    if (this.state.draggingSeek) return;
    this.decodeFrame(frame);
    this.focusTime();
  },
  handleSeekDragStart: function() {
    this.setState({draggingSeek: true});
  },
  handleSeekDragStop: function() {
    this.setState({draggingSeek: false});
    this.decodeFrame(this.state.frame);
    this.focusTime();
  },
  render: function() {
    // TODO(Kagami): Use icons.
    // TODO(Kagami): Show some placeholder if frameUrl is undefined?
    return (
      <div style={this.styles.root}>
        <div style={this.styles.view} onClick={this.handlePlayClick}>
          <div style={this.styles.ghost} />
          <img style={this.getFrameStyle()} src={this.state.frameUrl} />
        </div>
        <div style={this.styles.controls}>
          <FlatButton
            style={this.styles.control}
            label={this.state.playing ? "▮▮" : "▶"}
            title="Play/pause (SLOW)"
            onClick={this.handlePlayClick}
            disabled={this.isPlayDisabled()}
          />
          <FlatButton
            primary
            style={this.styles.control}
            label="⧏"
            title="Mark start"
            onClick={this.handleCutStartClick}
            />
          <input
            ref="time"
            type="text"
            title="Use Q/W/Up/Down/Enter/Space to adjust seek position"
            style={this.getTimeStyle()}
            maxLength={10}
            value={this.state.prettyTime}
            onChange={this.handleTimeChange}
            onKeyDown={this.handleTimeKey}
            onFocus={this.handleTimeFocus}
            onBlur={this.handleTimeBlur}
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
            disabled={this.state.playing || this.state.decodingFrame}
          />
        </div>
      </div>
    );
  },
});
