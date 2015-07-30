/**
 * Encoder UI widget.
 * @module webm/encoder
 */

import React from "react";
import {
  Paper, RadioButtonGroup, RadioButton, Checkbox,
  FlatButton, SelectField, TextField, ClearFix,
} from "material-ui";

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
  smallInput: {
    width: 110,
    marginRight: 10,
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
// filled text field because there is no other to display floating label
// by default.
// TODO(Kagami): Request this feature.
const Empty = {
  toString: () => "",
};

export default React.createClass({
  getInitialState: function() {
    return {};
  },
  handleMoreClick: function() {
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
            hintText="Select video track"
            menuItems={[]}
          />
        </div>
        <div style={styles.right}>
          <div>
            <TextField
              defaultValue={8}
              floatingLabelText="limit (MiB)"
              style={styles.smallInput}
            />
            <TextField
              defaultValue={Empty}
              floatingLabelText="quality (4÷63)"
              style={styles.smallInput}
            />
          </div>
          <div>
            <TextField
              defaultValue={Empty}
              floatingLabelText="qmin (4÷63)"
              style={styles.smallInput}
            />
            <TextField
              defaultValue={Empty}
              floatingLabelText="qmax (4÷63)"
              style={styles.smallInput}
            />
          </div>
        </div>
      </ClearFix>
    );
    const audio = (
      <ClearFix style={styles.section}>
        <div style={styles.left}>
          <Checkbox
            label="No audio"
          />
          <SelectField
            hintText="Select audio track"
            menuItems={[]}
          />
        </div>
        <div style={styles.right}>
          <TextField
            defaultValue={64}
            floatingLabelText="bitrate (kbits)"
            style={styles.smallInput}
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
              label="Burn subtitles"
              disabled
            />
            <SelectField
              hintText="Subtitles track"
              menuItems={[]}
              disabled
            />
          </div>
          <div style={styles.right}>
            <div>
              <TextField
                defaultValue={Empty}
                floatingLabelText="start (time)"
                style={styles.smallInput}
              />
              <TextField
                defaultValue={Empty}
                floatingLabelText="end (time)"
                style={styles.smallInput}
              />
            </div>
            <SelectField
              style={styles.smallSelect}
              hintText="Threads"
              menuItems={["1", "2"]}
            />
          </div>
        </ClearFix>
        <TextField
          floatingLabelText="Raw ffmpeg options"
          defaultValue="-i in.webm -pix_fmt +yuv420p -c:v libvpx -c:a libopus"
          multiLine
          fullWidth
        />
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
          onClick={this.handleMoreClick}
          label={this.state.advanced ? "basic" : "advanced"}
        />
      </Paper>
    );
  },
});
