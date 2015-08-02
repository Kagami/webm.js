/**
 * Output video params widget.
 * @module webm/params
 */
// TODO(Kagami): Fix all this mess with number/string variables
// intermixing.

import React from "react";
import {
  Paper, RadioButtonGroup, RadioButton, Checkbox,
  FlatButton, SelectField, ClearFix, TextField,
  RaisedButton,
} from "material-ui";
import {SmallInput} from "./theme";
import {ShowHide, has} from "./util";

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
    width: "60%",
  },
  right: {
    float: "left",
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
};

// XXX(Kagami): Singleton to satisfate `TextField.hasValue` and emulate
// filled text field because there is no other way to display floating
// label by default.
// TODO(Kagami): Request this feature.
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
  },
  DEFAULT_LIMIT: 8,
  DEFAULT_QUALITY: 20,
  DEFAULT_AUIDIO_BITRATE: 64,
  getLimitLabel: function() {
    return this.state.mode === "limit" ? "limit (MiB)" : "bitrate (kbits)";
  },
  getDurationLabel: function() {
    return this.state.useEndTime ? "end (time)" : "duration (time)";
  },
  getItems: function(type) {
    return this.props.info[type].map(track => {
      let text = `#${track.id} - ${track.codec}`;
      if (track.default) text += " (default)";
      return {payload: track.id, text};
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
  calcVideoBitrate: function({limit, audioBitrate}) {
    limit = +limit;
    audioBitrate = +audioBitrate;
    // FIXME(Kagami): Take start/end into account and check for zero
    // length/intersections/etc.
    const duration = this.props.info.duration;
    const limitKbits = limit * 8 * 1024;
    const vb = Math.floor(limitKbits / duration - audioBitrate);
    return vb > 0 ? vb : 1;
  },
  makeRawOpts: function(state) {
    // NOTE(Kagami): We accept state variables via arguments because
    // `setState` is asynchronous and values in `this.state` might be
    // outdated.
    // TODO(Kagami): Basic: scale, crop, custom filters.
    // TODO(Kagami): Advanced: quality, speed, set/clear metadata.
    let opts = [];
    // This might be `Empty`.
    const limit = state.limit.toString();
    const quality = state.quality.toString();
    let vb = state.mode === "limit" ? this.calcVideoBitrate(state) : +limit;
    if (vb !== 0) vb += "k";

    // Input.
    opts.push("-i", this.props.source.name);

    // Streams.

    // Video.
    // TODO(Kagami): We can improve quality a bit with "-speed 0 -g 9999".
    // Though this will slow down the encoding so we need to find the
    // best speed/quality compromise for in-browser use.
    opts.push("-c:v", "libvpx", "-speed", "1");
    opts.push("-auto-alt-ref", "1", "-lag-in-frames", "25");
    opts.push("-b:v", vb);
    if (quality !== "") opts.push("-crf", quality);

    // Audio.
    if (state.noAudio) {
      opts.push("-an");
    } else {
      opts.push("-c:a", "libopus", "-ac", "2");
      opts.push("-b:a", state.audioBitrate + "k");
    }

    // Subs.
    opts.push("-sn");

    return opts;
  },
  handleMode: function(e, mode) {
    // NOTE(Kagami): `radio.getSelectedValue` isn't always up-to-date,
    // so we need this function to get the actual value. See:
    // <https://github.com/callemall/material-ui/issues/295>.
    // Though we need this function anyway to fix some settings in the
    // moment of switch.
    let upd = {mode};
    const prevMode = this.state.mode;
    if (mode === "limit") {
      upd.limit = this.DEFAULT_LIMIT;
    } else if (mode === "bitrate") {
      if (prevMode === "limit") {
        upd.limit = this.calcVideoBitrate(this.state);
      } else if (prevMode === "constq") {
        upd.limit = "";
      }
    } else if (mode === "constq") {
      upd.limit = 0;
      if (!this.refs.quality.getValue()) {
        upd.quality = this.DEFAULT_QUALITY;
      }
    }
    this.handleUI(upd);
  },
  handleNoAudio: function(e, noAudio) {
    let audioBitrate = noAudio ? "0" : this.DEFAULT_AUIDIO_BITRATE;
    this.handleUI({audioBitrate});
  },
  // Helper to ignore passed event arguments.
  handleEvent: function() {
    this.handleUI();
  },
  handleSelect: function(name, e, index, payload) {
    let change = {};
    change[name] = payload.payload;
    this.handleUI(change);
  },
  handleRawOpts: function(e) {
    this.setState({rawOpts: e.target.value});
  },
  handleUI: function(preState) {
    preState = preState || {};
    function get(option, def) {
      return has(preState, option) ? preState[option] : def;
    }

    // Getting.
    let mode = get("mode", this.refs.mode.getSelectedValue());
    let videoTrack = get("videoTrack", this.state.videoTrack);
    let limit = get("limit", this.refs.limit.getValue());
    let quality = get("quality", this.refs.quality.getValue());
    let noAudio = this.refs.noAudio.isChecked();
    let audioTrack = get("audioTrack", this.state.audioTrack);
    let audioBitrate = get("audioBitrate", this.refs.audioBitrate.getValue());
    let useEndTime = this.refs.useEndTime.isChecked();
    let burnSubs = this.refs.burnSubs.isChecked();
    let subsTrack = get("subsTrack", this.state.subsTrack);
    let start = this.refs.start.getValue();
    let duration = this.refs.duration.getValue();
    let rawOpts = "";

    // Fixing.
    if (limit === "") limit = Empty;
    if (quality === "") quality = Empty;
    if (audioBitrate === "") audioBitrate = Empty;
    if (start === "") start = Empty;
    if (duration === "") duration = Empty;

    // FIXME(Kagami): Validation.
    let newState = {
      mode, videoTrack, limit, quality,
      noAudio, audioTrack, audioBitrate,
      useEndTime, burnSubs, subsTrack, start, duration,
    };
    rawOpts = this.makeRawOpts(newState).join(" ");
    newState.rawOpts = rawOpts;

    // Setting.
    this.setState(newState);
    // We don't use value property of TextField because it's very slow.
    // See: <https://github.com/callemall/material-ui/issues/1040>.
    this.refs.limit.setValue(limit);
    this.refs.quality.setValue(quality);
    this.refs.audioBitrate.setValue(audioBitrate);
    this.refs.start.setValue(start);
    this.refs.duration.setValue(duration);
    if (this.refs.rawOpts) this.refs.rawOpts.setValue(rawOpts);
  },
  handleUIModeClick: function() {
    this.setState({advanced: !this.state.advanced});
    this.handleUI();
  },
  handleEncodeClick: function() {
    const params = this.state.rawOpts.trim().split(/\s+/);
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
          />
        </div>
        <div style={styles.right}>
          <div>
            <SmallInput
              ref="limit"
              defaultValue={this.DEFAULT_LIMIT}
              floatingLabelText={this.getLimitLabel()}
              disabled={this.state.mode === "constq"}
              onBlur={this.handleEvent}
            />
            <SmallInput
              ref="quality"
              // NOTE(Kagami): This is not mandatory since we set it
              // `handleUI` anyway but omitting it here would cause a
              // noticeable flash.
              defaultValue={Empty}
              floatingLabelText="quality (4÷63)"
              onBlur={this.handleEvent}
            />
          </div>
          <ShowHide show={this.state.advanced}>
            <div>
              <SmallInput
                defaultValue={Empty}
                floatingLabelText="qmin (4÷63)"
              />
              <SmallInput
                defaultValue={Empty}
                floatingLabelText="qmax (4÷63)"
              />
            </div>
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
          />
          <SelectField
            value={this.state.audioTrack}
            hintText="Select audio track"
            // Doesn't work for now, see:
            // <https://github.com/callemall/material-ui/issues/1294>.
            // disabled={this.state.noAudio}
            onChange={this.handleSelect.bind(null, "audioTrack")}
            menuItems={this.getItems("audio")}
          />
        </div>
        <div style={styles.right}>
          <SmallInput
            ref="audioBitrate"
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
            />
            <SelectField
              value={this.state.subsTrack}
              hintText="Subtitles track"
              // disabled={!this.state.burnSubs}
              onChange={this.handleSelect.bind(null, "subsTrack")}
              menuItems={this.getItems("subs")}
            />
          </div>
          <div style={styles.right}>
            <div>
              <SmallInput
                ref="start"
                defaultValue={Empty}
                floatingLabelText="start (time)"
                onBlur={this.handleEvent}
              />
              <SmallInput
                ref="duration"
                defaultValue={Empty}
                floatingLabelText={this.getDurationLabel()}
                onBlur={this.handleEvent}
              />
            </div>
          </div>
        </ClearFix>
        <ShowHide show={this.state.advanced}>
          <TextField
            ref="rawOpts"
            floatingLabelText="Raw ffmpeg options"
            defaultValue={this.state.rawOpts}
            multiLine
            fullWidth
            onBlur={this.handleRawOpts}
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
