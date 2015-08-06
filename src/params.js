/**
 * Output video params widget.
 * @module webm/params
 */

import React from "react";
import {
  Paper, RadioButtonGroup, RadioButton, Checkbox,
  FlatButton, SelectField, ClearFix, TextField,
  RaisedButton, SmallInput,
} from "./theme";
import {ShowHide, has, DEFAULT_VTHREADS} from "./util";

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
  DEFAULT_QUALITY: 20,
  DEFAULT_AUIDIO_BITRATE: 64,
  DEFAULT_DURATION: window.localStorage && localStorage.DURATION || Empty,
  DEFAULT_SPEED: 1,

  getLimitLabel: function() {
    return this.state.mode === "limit" ? "limit (MiB)" : "bitrate (kbits)";
  },
  getDurationLabel: function() {
    return this.state.useEndTime ? "end (time)" : "duration (time)";
  },
  getItems: function(type) {
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
    // FIXME(Kagami): Take start/end into account.
    const duration = this.props.info.duration;
    const limitKbits = limit * 8 * 1024;
    const vb = Math.floor(limitKbits / duration - audioBitrate);
    return vb > 0 ? vb : 1;
  },
  makeRawArgs: function(opts) {
    let args = [];
    function maybeSet(name, value) {
      if (value !== "") args.push(name, value);
    }

    // Input.
    maybeSet("-ss", opts.start);
    args.push("-i", this.props.source.safeName);
    if (opts.duration !== "") {
      // FIXME(Kagami): Fix duration in case of `useEndTime`.
      // NOTE(Kagami): We always use `-t` in resulting command because
      // `-ss` before `-i` resets the timestamp, see:
      // <https://trac.ffmpeg.org/wiki/Seeking#Notes>.
      args.push("-t", opts.duration);
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
    let vb = opts.mode === "limit" ? this.calcVideoBitrate(opts) : opts.limit;
    if (vb !== 0) vb += "k";
    args.push("-c:v", "libvpx", "-b:v", vb);
    args.push("-speed", opts.speed);
    args.push("-threads", opts.threads);
    args.push("-auto-alt-ref", "1", "-lag-in-frames", "25");
    maybeSet("-crf", opts.quality);
    maybeSet("-qmin", opts.qmin);
    maybeSet("-qmax", opts.qmax);

    // Audio.
    if (opts.noAudio) {
      args.push("-an");
    } else {
      args.push("-c:a", "libopus");
      args.push("-b:a", opts.audioBitrate + "k");
      args.push("-ac", "2");
    }

    // Subs.
    args.push("-sn");

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
        // XXX(Kagami): State may contain outdated values if the current
        // values in text fields are invalid.
        upd.limit = this.calcVideoBitrate(this.state);
      } else if (prevMode === "constq") {
        upd.limit = "";
      }
    } else if (mode === "constq") {
      upd.limit = 0;
      upd.quality = this.DEFAULT_QUALITY;
    }
    this.handleUI(upd);
  },
  handleNoAudio: function(e, noAudio) {
    let audioBitrate = noAudio ? 0 : this.DEFAULT_AUIDIO_BITRATE;
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
  handleRawOpts: function(e) {
    this.setState({rawOpts: e.target.value});
  },
  handleUI: function(preState) {
    preState = preState || {};
    const refs = this.refs;
    function get(option, def) {
      return has(preState, option) ? preState[option] : def;
    }
    function getText(name, def) {
      def = def || "";
      return refs[name] ? refs[name].getValue() : def;
    }
    function setText(name, value) {
      if (value === "") value = Empty;
      if (refs[name]) refs[name].setValue(value);
    }

    let mode = get("mode", refs.mode.getSelectedValue());
    let videoTrack = get("videoTrack", this.state.videoTrack);
    let limit = get("limit", getText("limit"));
    let quality = get("quality", getText("quality"));
    let qmin = getText("qmin");
    let qmax = getText("qmax");
    let noAudio = refs.noAudio.isChecked();
    let audioTrack = get("audioTrack", this.state.audioTrack);
    let audioBitrate = get("audioBitrate", getText("audioBitrate"));
    let useEndTime = refs.useEndTime.isChecked();
    let burnSubs = refs.burnSubs.isChecked();
    let subsTrack = get("subsTrack", this.state.subsTrack);
    let start = getText("start");
    let duration = getText("duration");
    let threads = getText("threads", DEFAULT_VTHREADS);
    let speed = getText("speed", this.DEFAULT_SPEED);
    let rawOpts = "";

    // FIXME(Kagami): Validation.
    limit = +limit;
    audioBitrate = +audioBitrate;
    threads = +threads;
    speed = +speed;
    if (noAudio) audioBitrate = 0;

    let newState = {
      mode, videoTrack, limit, quality, qmin, qmax,
      noAudio, audioTrack, audioBitrate,
      useEndTime, burnSubs, subsTrack, start, duration, threads, speed,
    };
    newState.rawOpts = rawOpts = this.makeRawArgs(newState).join(" ");

    this.setState(newState);
    // XXX(Kagami): We don't use value property of `TextField` because
    // it's very slow, see:
    // <https://github.com/callemall/material-ui/issues/1040>.
    setText("limit", limit);
    setText("quality", quality);
    setText("qmin", qmin);
    setText("qmax", qmax);
    setText("audioBitrate", audioBitrate);
    setText("start", start);
    setText("duration", duration);
    setText("threads", threads);
    setText("speed", speed);
    setText("rawOpts", rawOpts);
  },
  handleUIModeClick: function() {
    this.setState({advanced: !this.state.advanced});
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
                ref="qmin"
                defaultValue={Empty}
                floatingLabelText="qmin (4÷63)"
                onBlur={this.handleEvent}
              />
              <SmallInput
                ref="qmax"
                defaultValue={Empty}
                floatingLabelText="qmax (4÷63)"
                onBlur={this.handleEvent}
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
                defaultValue={this.DEFAULT_DURATION}
                floatingLabelText={this.getDurationLabel()}
                onBlur={this.handleEvent}
              />
            </div>
            <ShowHide show={this.state.advanced}>
              <div>
                <SmallInput
                  ref="threads"
                  defaultValue={DEFAULT_VTHREADS}
                  floatingLabelText="threads (1÷8)"
                  onBlur={this.handleEvent}
                />
                <SmallInput
                  ref="speed"
                  defaultValue={this.DEFAULT_SPEED}
                  floatingLabelText="speed (0÷5)"
                  onBlur={this.handleEvent}
                />
              </div>
            </ShowHide>
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
