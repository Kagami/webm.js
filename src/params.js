/**
 * Output video params widget.
 * @module webm/params
 */

import React from "react";
import {parseTime} from "./ffmpeg";
import {
  Paper, RadioButtonGroup, RadioButton, Checkbox,
  FlatButton, SelectField, ClearFix, TextField,
  RaisedButton, SmallInput,
} from "./theme";
import {
  ShowHide, has,
  MIN_VTHREADS, DEFAULT_VTHREADS, MAX_VTHREADS
} from "./util";

const styles = {
  root: {
    position: "relative",
  },
  header: {
    paddingTop: 8,
    paddingLeft: 8,
    color: "#e0e0e0",
    fontWeight: 500,
    fontSize: "18px",
    textTransform: "uppercase",
  },
  section: {
    padding: "16px 24px",
    borderBottom: "1px solid #e0e0e0",
  },
  lastSection: {
    padding: "16px 24px 24px 24px",
  },
  left: {
    float: "left",
  },
  right: {
    float: "right",
    width: 420,
    marginTop: -30,
  },
  smallSelect: {
    width: 230,
  },
  encode: {
    textAlign: "center",
    paddingBottom: 16,
  },
  bigButton: {
    width: 250,
  },
  uiMode: {
    width: 110,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 0,
  },
  spaceBelow: {
    marginBottom: 10,
  },
  tracks: {
    width: 300,
  },
  track: {
    textOverflow: "ellipsis",
    overflow: "hidden",
    paddingRight: 24,
  },
  cropInput: {
    width: 67.5,
    marginBottom: 10,
  },
};

// TODO(Kagami): We use fake object to satisfate `TextField.hasValue`
// and emulate filled text field because there is no other way to always
// display floating label. It would be better to request this feature.
const Empty = {
  toString: function() {
    return "";
  },
};

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    this.handleUI();
    if (window.localStorage && localStorage.SKIP_PARAMS) {
      // Workaround asynchronous setState.
      setTimeout(this.handleEncodeClick);
    }
  },

  DEFAULT_LIMIT: 8,
  MIN_Q: 4,
  DEFAULT_QUALITY: 20,
  MAX_Q: 63,
  MIN_AUIDIO_BITRATE: 6,
  DEFAULT_AUIDIO_BITRATE: 64,
  MAX_AUIDIO_BITRATE: 510,
  DEFAULT_DURATION: window.localStorage && localStorage.DURATION || Empty,
  MIN_SPEED: 0,
  DEFAULT_SPEED: 1,
  MAX_SPEED: 5,

  getLimitLabel: function() {
    return this.state.mode === "limit" ? "limit (MiB)" : "bitrate (kbits)";
  },
  getDurationLabel: function() {
    return this.state.useEndTime ? "end (time)" : "duration (time)";
  },
  getItems: function(type, relIndex) {
    return this.props.info[type].map(track => {
      let text = `#${track.id} - ${track.codec}`;
      if (track.lang || track.default || track.forced) {
        text += " (";
        let chunks = [];
        if (track.lang) chunks.push(track.lang);
        if (track.default) chunks.push("default");
        if (track.forced) chunks.push("forced");
        text += chunks.join(", ");
        text += ")";
      }
      if (track.title) text += " " + track.title;
      // subtitles filter accepts relative sub index.
      const payload = type === "subs" && relIndex ? track.si : track.id;
      return {payload, text};
    });
  },
  // NOTE(Kagami): We will always have video tracks because we checked
  // for them in Info component. Audio/subtitles tracks are not required
  // though.
  hasAudioTracks: function() {
    return !!this.props.info.audio.length;
  },
  hasSubsTracks: function() {
    return !!this.props.info.subs.length;
  },
  calcVideoBitrate: function({limit, outduration, audioBitrate}) {
    const limitKbits = limit * 8 * 1024;
    const vb = Math.floor(limitKbits / outduration - audioBitrate);
    // We may raise an error here instead of fixing it.
    return vb > 0 ? vb : 1;
  },
  makeRawArgs: function(opts) {
    let args = [];
    let vfilters = [];
    const path = this.props.source.path;
    const vb = opts.mode === "limit" ? this.calcVideoBitrate(opts) : opts.limit;
    const subDelay = parseTime(opts.start || 0);
    function maybeSet(name, value) {
      if (value !== "") args.push(name, value);
    }

    // Input.
    maybeSet("-ss", opts.start);
    args.push("-i", path);
    if (opts.duration !== "") {
      // NOTE(Kagami): We always use `-t` in resulting command because
      // `-ss` before `-i` resets the timestamp, see:
      // <https://trac.ffmpeg.org/wiki/Seeking#Notes>.
      args.push("-t", opts.outduration);
    }

    // Streams.
    if (opts.videoTrack != null || opts.audioTrack != null) {
      args.push("-map", "0:" + (opts.videoTrack || "v:0"));
      args.push("-map", "0:" + (opts.audioTrack || "a:0"));
    }

    // Video.
    // TODO(Kagami): We can improve quality a bit with "-speed 0 -g 9999".
    // Though this will slow down the encoding so we need to find the
    // best speed/quality compromise for in-browser use.
    args.push("-threads", opts.threads);
    args.push("-c:v", "libvpx", "-b:v", vb === 0 ? 0 : vb + "k");
    maybeSet("-crf", opts.quality);
    maybeSet("-qmin", opts.qmin);
    maybeSet("-qmax", opts.qmax);
    args.push("-speed", opts.speed);
    args.push("-auto-alt-ref", "1", "-lag-in-frames", "25");

    // Filters.
    if (opts.cropx !== "" || opts.cropy !== "" ||
        opts.cropw !== "" || opts.croph !== "") {
      let crop = [];
      if (opts.cropx !== "") crop.push("x=" + opts.cropx);
      if (opts.cropy !== "") crop.push("y=" + opts.cropy);
      if (opts.cropw !== "") crop.push("w=" + opts.cropw);
      if (opts.croph !== "") crop.push("h=" + opts.croph);
      vfilters.push("crop=" + crop.join(":"));
    }
    // We force value in second field if first is specified in UI.
    if (opts.width !== "") {
      vfilters.push("scale=" + opts.width + ":" + opts.height);
    }
    // We currently only burn subs because browsers don't display WebVTT
    // subs in normal <video> elements and because all Firefox versions
    // < ~40 can't play webms with subtitles track at all.
    args.push("-sn");
    if (opts.burnSubs) {
      // NOTE(Kagami): Apply setpts even if delay is zero to simplify
      // `getPartParams` routine.
      vfilters.push("setpts=PTS+" + subDelay + "/TB");
      let subtitles = "subtitles=" + path;
      if (opts.subsTrack != null) subtitles += ":si=" + opts.subsTrack;
      vfilters.push(subtitles);
      vfilters.push("setpts=PTS-STARTPTS");
    }
    if (vfilters.length) {
      args.push("-vf", vfilters.join(","));
    }

    // Audio.
    if (opts.noAudio) {
      args.push("-an");
    } else {
      args.push("-c:a", "libopus");
      args.push("-b:a", opts.audioBitrate + "k");
      args.push("-ac", "2");
    }

    return args;
  },
  handleMode: function(e, mode) {
    // NOTE(Kagami): `radio.getSelectedValue` isn't always up-to-date,
    // so we need this function to get the actual value. See:
    // <https://github.com/callemall/material-ui/issues/295>.
    // Though we need this function anyway to fix some settings in the
    // moment of switch.
    const prevMode = this.state.mode;
    let upd = {mode, quality: ""};
    if (mode === "limit") {
      upd.limit = this.DEFAULT_LIMIT;
    } else if (mode === "bitrate") {
      if (prevMode === "limit") {
        upd.limit = this.calcVideoBitrate(this.state);
      }
    } else if (mode === "constq") {
      upd.limit = 0;
      upd.quality = this.DEFAULT_QUALITY;
    }
    this.handleUI(upd);
  },
  handleNoAudio: function(e, noAudio) {
    const audioBitrate = noAudio ? 0 : this.DEFAULT_AUIDIO_BITRATE;
    this.handleUI({audioBitrate});
  },
  handleEvent: function() {
    // Ignore passed event arguments.
    this.handleUI();
  },
  handleSelect: function(name, e, index, payload) {
    let change = {};
    change[name] = payload.payload;
    this.handleUI(change);
  },
  handleRawArgs: function(e) {
    this.setState({rawArgs: e.target.value});
  },
  // FIXME(Kagami): Someone, please refactor this shit in React-way.
  handleUI: function(preState) {
    preState = preState || {};
    function get(option, def) {
      return has(preState, option) ? preState[option] : def;
    }

    const refs = this.refs;
    function getText(name, def) {
      def = def || "";
      return refs[name] ? refs[name].getValue() : def;
    }
    function setText(name, value) {
      if (value === "") value = Empty;
      if (refs[name]) refs[name].setValue(value);
    }

    let valid = true;
    function requireInt(value) {
      value = value.toString();
      if (!/^\d+$/.exec(value)) throw new Error("Int required");
      return +value;
    }
    function requireFloat(value) {
      value = value.toString();
      if (!/^\d+(\.\d+)?$/.exec(value)) throw new Error("Float required");
      return +value;
    }
    function requireRange(value, min, max) {
      if (value < min || value > max) throw new Error("Bad range");
      return value;
    }
    const validate = (value, errKey, validator) => {
      let res = value;
      let errRes;
      try {
        res = validator(value);
      } catch(e) {
        errRes = e.message;
        valid = false;
      }
      let errState = {valid};
      errState[errKey] = errRes;
      this.setState(errState);
      return res;
    };

    let mode = get("mode", refs.mode.getSelectedValue());
    let videoTrack = get("videoTrack", this.state.videoTrack);
    let cropx = getText("cropx");
    let cropy = getText("cropy");
    let cropw = getText("cropw");
    let croph = getText("croph");
    let limit = get("limit", getText("limit"));
    let quality = get("quality", getText("quality"));
    let width = getText("width");
    let height = getText("height");
    let qmin = getText("qmin");
    let qmax = getText("qmax");
    let noAudio = refs.noAudio.isChecked();
    let audioTrack = get("audioTrack", this.state.audioTrack);
    let audioBitrate = get("audioBitrate", getText("audioBitrate"));
    let useEndTime = get("useEndTime", refs.useEndTime.isChecked());
    let burnSubs = refs.burnSubs.isChecked();
    let subsTrack = get("subsTrack", this.state.subsTrack);
    let start = get("start", getText("start"));
    let duration = get("duration", getText("duration"));
    let threads = getText("threads", DEFAULT_VTHREADS);
    let speed = getText("speed", this.DEFAULT_SPEED);
    // Computed values.
    const induration = this.props.info.duration;
    let ss;
    let outduration;
    let rawArgs;

    // Validate & transform.
    // NOTE(Kagami): Crop & scale filter parameters can contain
    // arbitrary expressions but we validate them as numbers anyway
    // because user can always fix them in raw opts field.
    cropx = validate(cropx, "cropxErr", (v) => {
      if (v === "") return v;
      return requireInt(v);
    });
    cropy = validate(cropy, "cropyErr", (v) => {
      if (v === "") return v;
      return requireInt(v);
    });
    cropw = validate(cropw, "cropwErr", (v) => {
      if (v === "") return v;
      return requireInt(v);
    });
    croph = validate(croph, "crophErr", (v) => {
      if (v === "") return v;
      return requireInt(v);
    });
    limit = validate(limit, "limitErr", (v) => {
      v = requireFloat(v);
      if (mode === "limit" && v <= 0) throw new Error("Value is too small");
      return v;
    });
    quality = validate(quality, "qualityErr", (v) => {
      if (v === "") return v;
      v = requireInt(v);
      return requireRange(v, this.MIN_Q, this.MAX_Q);
    });
    width = validate(width, "widthErr", (v) => {
      if (v === "") {
        if (height !== "" && height !== "-1") return -1;
        if (height === "-1") height = "";
        return "";
      }
      if (v === "-1") return -1;
      return requireInt(v);
    });
    height = validate(height, "heightErr", (v) => {
      // Beware that width is already coersed to Number here.
      if (v === "") {
        if (width !== "" && width !== -1) return -1;
        if (width === -1) width = "";
        return "";
      }
      if (v === "-1") return -1;
      return requireInt(v);
    });
    qmin = validate(qmin, "qminErr", (v) => {
      if (v === "") return v;
      v = requireInt(v);
      return requireRange(v, this.MIN_Q, this.MAX_Q);
    });
    qmax = validate(qmax, "qmaxErr", (v) => {
      if (v === "") return v;
      v = requireInt(v);
      return requireRange(v, this.MIN_Q, this.MAX_Q);
    });
    audioBitrate = validate(audioBitrate, "audioBitrateErr", (v) => {
      v = requireFloat(v);
      if (noAudio) return 0;
      return requireRange(v, this.MIN_AUIDIO_BITRATE, this.MAX_AUIDIO_BITRATE);
    });
    ss = validate(start, "startErr", (v) => {
      if (v === "") return 0;
      // NOTE(Kagami): We don't transform "start" because it's more
      // convenient for the users to see formatted timestamp in input.
      v = parseTime(v);
      if (v >= induration) throw new Error("Too far");
      return v;
    });
    if (valid) {
      outduration = validate(duration, "durationErr", (v) => {
        if (v === "") return induration - ss;
        v = parseTime(v);
        if (v === 0) throw new Error("Zero duration");
        if (useEndTime) {
          if (ss >= v) throw new Error("Less than start");
          v -= ss;
        }
        if (v + ss > induration) throw new Error("Too far");
        return v;
      });
    }
    threads = validate(threads, "threadsErr", (v) => {
      v = requireInt(v);
      return requireRange(v, MIN_VTHREADS, MAX_VTHREADS);
    });
    speed = validate(speed, "speedErr", (v) => {
      v = requireInt(v);
      return requireRange(v, this.MIN_SPEED, this.MAX_SPEED);
    });

    // Always update text fields in order to enforce filled style.
    // XXX(Kagami): We don't use value property of `TextField` because
    // it's very slow, see:
    // <https://github.com/callemall/material-ui/issues/1040>.
    setText("cropx", cropx);
    setText("cropy", cropy);
    setText("cropw", cropw);
    setText("croph", croph);
    setText("limit", limit);
    setText("quality", quality);
    setText("width", width);
    setText("height", height);
    setText("qmin", qmin);
    setText("qmax", qmax);
    setText("audioBitrate", audioBitrate);
    refs.useEndTime.setChecked(useEndTime);
    setText("start", start);
    setText("duration", duration);
    setText("threads", threads);
    setText("speed", speed);
    if (!valid) return;

    // Set validated and normalized values.
    let newState = {
      mode, videoTrack,
      cropx, cropy, cropw, croph,
      limit, quality, width, height, qmin, qmax,
      noAudio, audioTrack, audioBitrate,
      useEndTime, burnSubs, subsTrack, start, duration, threads, speed,
      outduration,
    };
    newState.rawArgs = rawArgs = this.makeRawArgs(newState).join(" ");
    setText("rawArgs", rawArgs);
    this.setState(newState);
  },
  handleUIModeClick: function() {
    this.setState({advanced: !this.state.advanced});
  },
  handleEncodeClick: function() {
    const params = this.state.rawArgs.trim().split(/\s+/);
    this.props.onReady(params);
  },
  render: function() {
    const video = (
      <ClearFix style={styles.section}>
        <div style={styles.left}>
          <RadioButtonGroup
            ref="mode"
            name="mode"
            defaultSelected="limit"
            onChange={this.handleMode}
            style={styles.spaceBelow}
          >
            <RadioButton
              value="limit"
              label="Fit to limit"
            />
            <RadioButton
              value="bitrate"
              label="Custom bitrate"
            />
            <RadioButton
              value="constq"
              label="Constant quality"
            />
          </RadioButtonGroup>
          <SelectField
            value={this.state.videoTrack}
            hintText="Select video track"
            onChange={this.handleSelect.bind(null, "videoTrack")}
            menuItems={this.getItems("video")}
            style={styles.tracks}
            menuItemStyle={styles.track}
          />
          <ClearFix>
            <SmallInput
              ref="cropx"
              errorText={this.state.cropxErr}
              defaultValue={Empty}
              floatingLabelText="crop x"
              onBlur={this.handleEvent}
              style={styles.cropInput}
            />
            <SmallInput
              ref="cropy"
              errorText={this.state.cropyErr}
              defaultValue={Empty}
              floatingLabelText="crop y"
              onBlur={this.handleEvent}
              style={styles.cropInput}
            />
            <SmallInput
              ref="cropw"
              errorText={this.state.cropwErr}
              defaultValue={Empty}
              floatingLabelText="crop w"
              onBlur={this.handleEvent}
              style={styles.cropInput}
            />
            <SmallInput
              ref="croph"
              errorText={this.state.crophErr}
              defaultValue={Empty}
              floatingLabelText="crop h"
              onBlur={this.handleEvent}
              style={styles.cropInput}
            />
          </ClearFix>
        </div>
        <div style={styles.right}>
          <ClearFix>
            <SmallInput
              ref="limit"
              errorText={this.state.limitErr}
              defaultValue={this.DEFAULT_LIMIT}
              floatingLabelText={this.getLimitLabel()}
              disabled={this.state.mode === "constq"}
              onBlur={this.handleEvent}
            />
            <SmallInput
              ref="quality"
              errorText={this.state.qualityErr}
              // NOTE(Kagami): This is not mandatory since we set it
              // `handleUI` anyway but omitting it here would cause a
              // noticeable flash.
              defaultValue={Empty}
              floatingLabelText="quality (4÷63)"
              onBlur={this.handleEvent}
            />
          </ClearFix>
          <ClearFix>
            <SmallInput
              ref="width"
              errorText={this.state.widthErr}
              defaultValue={Empty}
              floatingLabelText="width (px)"
              onBlur={this.handleEvent}
            />
            <SmallInput
              ref="height"
              errorText={this.state.heightErr}
              defaultValue={Empty}
              floatingLabelText="height (px)"
              onBlur={this.handleEvent}
            />
          </ClearFix>
          <ShowHide show={this.state.advanced}>
            <ClearFix>
              <SmallInput
                ref="qmin"
                errorText={this.state.qminErr}
                defaultValue={Empty}
                floatingLabelText="qmin (4÷63)"
                onBlur={this.handleEvent}
              />
              <SmallInput
                ref="qmax"
                errorText={this.state.qmaxErr}
                defaultValue={Empty}
                floatingLabelText="qmax (4÷63)"
                onBlur={this.handleEvent}
              />
            </ClearFix>
          </ShowHide>
        </div>
      </ClearFix>
    );
    const audio = (
      <ClearFix style={styles.section}>
        <div style={styles.left}>
          <Checkbox
            ref="noAudio"
            label="No audio"
            onCheck={this.handleNoAudio}
            disabled={!this.hasAudioTracks()}
            defaultChecked={!this.hasAudioTracks()}
            style={styles.spaceBelow}
          />
          <SelectField
            value={this.state.audioTrack}
            hintText="Select audio track"
            // Doesn't work for now, see:
            // <https://github.com/callemall/material-ui/issues/1294>.
            // disabled={this.state.noAudio}
            onChange={this.handleSelect.bind(null, "audioTrack")}
            menuItems={this.getItems("audio")}
            style={styles.tracks}
            menuItemStyle={styles.track}
          />
        </div>
        <div style={styles.right}>
          <SmallInput
            ref="audioBitrate"
            errorText={this.state.audioBitrateErr}
            defaultValue={this.DEFAULT_AUIDIO_BITRATE}
            floatingLabelText="bitrate (kbits)"
            disabled={this.state.noAudio}
            onBlur={this.handleEvent}
          />
        </div>
      </ClearFix>
    );
    const other = (
      <div style={styles.lastSection}>
        <ClearFix>
          <div style={styles.left}>
            <Checkbox
              ref="useEndTime"
              label="Specify end time"
              onCheck={this.handleEvent}
            />
            <Checkbox
              ref="burnSubs"
              label="Burn subtitles"
              onCheck={this.handleEvent}
              disabled={!this.hasSubsTracks()}
              defaultChecked={this.hasSubsTracks()}
              style={styles.spaceBelow}
            />
            <SelectField
              value={this.state.subsTrack}
              hintText="Subtitles track"
              // disabled={!this.state.burnSubs}
              onChange={this.handleSelect.bind(null, "subsTrack")}
              menuItems={this.getItems("subs", this.state.burnSubs)}
              style={styles.tracks}
              menuItemStyle={styles.track}
            />
          </div>
          <div style={styles.right}>
            <ClearFix>
              <SmallInput
                ref="start"
                errorText={this.state.startErr}
                defaultValue={Empty}
                floatingLabelText="start (time)"
                onBlur={this.handleEvent}
              />
              <SmallInput
                ref="duration"
                errorText={this.state.durationErr}
                defaultValue={this.DEFAULT_DURATION}
                floatingLabelText={this.getDurationLabel()}
                onBlur={this.handleEvent}
              />
            </ClearFix>
            <ShowHide show={this.state.advanced}>
              <ClearFix>
                <SmallInput
                  ref="threads"
                  errorText={this.state.threadsErr}
                  defaultValue={DEFAULT_VTHREADS}
                  floatingLabelText="threads (1÷8)"
                  onBlur={this.handleEvent}
                />
                <SmallInput
                  ref="speed"
                  errorText={this.state.speedErr}
                  defaultValue={this.DEFAULT_SPEED}
                  floatingLabelText="speed (0÷5)"
                  onBlur={this.handleEvent}
                />
              </ClearFix>
            </ShowHide>
          </div>
        </ClearFix>
        <ShowHide show={this.state.advanced}>
          <TextField
            ref="rawArgs"
            floatingLabelText="Raw ffmpeg options"
            defaultValue={this.state.rawArgs || Empty}
            multiLine
            fullWidth
            onBlur={this.handleRawArgs}
            style={styles.spaceBelow}
          />
        </ShowHide>
      </div>
    );
    return (
      <Paper style={styles.root}>
        <div style={styles.header}>output video params</div>
        {video}
        <div style={styles.header}>audio</div>
        {audio}
        <div style={styles.header}>other</div>
        {other}
        <div style={styles.encode}>
          <RaisedButton
            style={styles.bigButton}
            primary
            label="start encoding"
            disabled={!this.state.valid}
            onClick={this.handleEncodeClick}
          />
        </div>
        <FlatButton
          primary
          style={styles.uiMode}
          onClick={this.handleUIModeClick}
          label={this.state.advanced ? "basic" : "advanced"}
        />
      </Paper>
    );
  },
});
