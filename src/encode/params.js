/**
 * Output video params widget.
 * @module webm/encoder/params
 */

import React from "react";
import {
  Paper, RadioButtonGroup, RadioButton, Checkbox,
  FlatButton, SelectField, ClearFix, TextField,
} from "material-ui";
import {SmallInput} from "../theme";
import {ShowHide, has} from "../util";

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
    padding: "24px 24px 36px 24px",
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
  more: {
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
  DEFAULT_LIMIT: "8",
  DEFAULT_QUALITY: "20",
  DEFAULT_AUIDIO_BITRATE: "64",
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    this.handleUI();
  },
  getLimitLabel: function() {
    return this.state.mode === "limit" ? "limit (MiB)" : "bitrate (kbits)";
  },
  getEndRangeLabel: function() {
    return this.state.useDuration ? "duration (time)" : "end (time)";
  },
  getItems: function(type) {
    return this.props.info[type].map(track => {
      const text = `#${track.id} - ${track.codec}`;
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
  handleMode: function(e, mode) {
    // NOTE(Kagami): `radio.getSelectedValue` isn't always up-to-date,
    // so we need this function to get the actual value. See:
    // <https://github.com/callemall/material-ui/issues/295>.
    // Though we also need this function to fix some settings in the
    // moment of switch.
    let upd = {mode};
    if (mode === "limit") {
      upd.limit = this.DEFAULT_LIMIT;
    } else if (mode === "bitrate") {
      upd.limit = "800";
    } else if (mode === "constq") {
      upd.limit = "0";
      if (!this.refs.quality.getValue()) {
        upd.quality = this.DEFAULT_QUALITY;
      }
    }
    this.handleUI(upd);
  },
  handleNoAudio: function(e, noAudio) {
    let audioBitrate = noAudio ? "0": this.DEFAULT_AUIDIO_BITRATE;
    this.handleUI({audioBitrate});
  },
  // Helper to ignore passed event arguments.
  handleEvent: function() {
    this.handleUI();
  },
  handleSelect: function(name, e, index, payload) {
    let change = {}
    change[name] = payload.payload;
    this.handleUI(change);
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
    let useDuration = this.refs.useDuration.isChecked();
    let burnSubs = this.refs.burnSubs.isChecked();
    let subsTrack = get("subsTrack", this.state.subsTrack);

    // Fixing.
    if (!limit) limit = Empty;
    if (!quality) quality = Empty;
    if (!audioBitrate) audioBitrate = Empty;

    // Validation.

    // Setting.
    this.setState({
      mode, videoTrack, limit, quality,
      noAudio, audioTrack, audioBitrate,
      useDuration, burnSubs, subsTrack,
    });
    // We don't use value property of TextField because it's very slow.
    // See: <https://github.com/callemall/material-ui/issues/1040>.
    this.refs.limit.setValue(limit);
    this.refs.quality.setValue(quality);
    this.refs.audioBitrate.setValue(audioBitrate);
  },
  handleModeClick: function() {
    this.setState({advanced: !this.state.advanced});
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
              ref="useDuration"
              label="Specify duration"
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
                defaultValue={Empty}
                floatingLabelText="start (time)"
              />
              <SmallInput
                defaultValue={Empty}
                floatingLabelText={this.getEndRangeLabel()}
              />
            </div>
            <ShowHide show={this.state.advanced}>
              <SelectField
                style={styles.smallSelect}
                hintText="Threads"
                menuItems={["1", "2"]}
              />
            </ShowHide>
          </div>
        </ClearFix>
        <ShowHide show={this.state.advanced}>
          <TextField
            floatingLabelText="Raw ffmpeg options"
            defaultValue="-i in.webm -pix_fmt +yuv420p -c:v libvpx -c:a libopus"
            multiLine
            fullWidth
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
        <FlatButton
          primary
          style={styles.more}
          onClick={this.handleModeClick}
          label={this.state.advanced ? "basic" : "advanced"}
        />
      </Paper>
    );
  },
});
