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
import {ShowHide} from "../util";

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
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    this.handleUI();
  },
  getItems: function(type) {
    return this.props.info[type].map(track => {
      const text = `#${track.id} - ${track.codec}`;
      return {payload: track.id, text};
    }).concat({});
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
  handleSelect: function(name, e, index, payload) {
    let change = {}
    change[name] = payload;
    this.handleUI(change);
  },
  handleUI: function(preState) {
    // Getting & fixing.
    const state = Object.assign({}, this.state, preState);
    const noAudio = this.refs.noAudio.isChecked();
    let audioTrack = state.audioTrack;
    let audioBitrate = this.refs.audioBitrate.getValue();
    if (noAudio) {
      audioTrack = undefined;
      audioBitrate = undefined;
    }
    if (!audioBitrate) audioBitrate = Empty;
    const burnSubs = this.refs.burnSubs.isChecked();

    // Validation.

    // Setting.
    this.setState({audioTrack, audioBitrate, noAudio, burnSubs});
    // We don't use value property of TextField because it's very slow
    // for now. See:
    // <https://github.com/callemall/material-ui/issues/1040>.
    this.refs.audioBitrate.setValue(audioBitrate);
  },
  handleModeClick: function() {
    this.setState({advanced: !this.state.advanced});
  },
  render: function() {
    const video = (
      <ClearFix style={styles.section}>
        <div style={styles.left}>
          <RadioButtonGroup name="mode" defaultSelected="limit">
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
              defaultValue={8}
              floatingLabelText="limit (MiB)"
            />
            <SmallInput
              defaultValue={Empty}
              floatingLabelText="quality (4÷63)"
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
            onCheck={this.handleUI}
            disabled={!this.hasAudioTracks()}
            defaultChecked={!this.hasAudioTracks()}
          />
          <SelectField
            value={this.state.audioTrack}
            hintText="Select audio track"
            disabled={this.state.noAudio}
            onChange={this.handleSelect.bind(null, "audioTrack")}
            menuItems={this.getItems("audio")}
          />
        </div>
        <div style={styles.right}>
          <TextField
            ref="audioBitrate"
            defaultValue={64}
            floatingLabelText="bitrate (kbits)"
            disabled={this.state.noAudio}
          />
        </div>
      </ClearFix>
    );
    const other = (
      <div style={styles.lastSection}>
        <ClearFix>
          <div style={styles.left}>
            <Checkbox
              label="Specify duration"
            />
            <Checkbox
              ref="burnSubs"
              label="Burn subtitles"
              onCheck={this.handleUI}
              disabled={!this.hasSubsTracks()}
              defaultChecked={this.hasSubsTracks()}
            />
            <SelectField
              value={this.state.subsTrack}
              hintText="Subtitles track"
              // Doesn't work for now, see:
              // <https://github.com/callemall/material-ui/issues/1294>.
              disabled={!this.state.burnSubs}
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
                floatingLabelText="end (time)"
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
