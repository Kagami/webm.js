/**
 * webm.js theme-related code and components.
 * @module webm/theme
 */

import React from "react";
import ThemeManager from "material-ui/lib/styles/theme-manager";
import Paper from "material-ui/lib/paper";
import CircularProgress from "material-ui/lib/circular-progress";
import FlatButton from "material-ui/lib/flat-button";
import TextField from "material-ui/lib/text-field";
// Reexport only particular material-ui components to minimize size of
// the build. See <https://github.com/callemall/material-ui/issues/1317>
// for details.
export {Paper, CircularProgress, FlatButton, TextField};
export {default as ClearFix} from "material-ui/lib/clearfix";
export {default as RaisedButton} from "material-ui/lib/raised-button";
export {default as LinearProgress} from "material-ui/lib/linear-progress";
export {default as Tabs} from "material-ui/lib/tabs/tabs";
export {default as Tab} from "material-ui/lib/tabs/tab";
export {default as RadioButtonGroup} from "material-ui/lib/radio-button-group";
export {default as RadioButton} from "material-ui/lib/radio-button";
export {default as Checkbox} from "material-ui/lib/checkbox";
export {default as SelectField} from "material-ui/lib/select-field";
export {default as Slider} from "material-ui/lib/slider";

export const themeManager = new ThemeManager();

// Some theme constants.
// 16:9, reasonably large and 960px is popular grid width.
export const boxWidth = 960;
export const boxHeight = 540;
export const boxAspect = boxWidth / boxHeight;
export const secondaryColor = "#999";

/** Common containing element. */
export const Container = React.createClass({
  styles: {
    container: {
      width: boxWidth,
      margin: "0 auto",
    },
  },
  render: function() {
    return <div style={this.styles.container}>{this.props.children}</div>;
  },
});

export const InlineButton = React.createClass({
  styles: {
    fix: {
      lineHeight: "30px",
      minWidth: 0,
      fontSize: "inherit",
      textTransform: "none",
      // Cause wrong aligning in Firefox.
      transform: "none",
    },
    labelFix: {
      padding: 0,
    },
  },
  render: function() {
    let style = Object.assign({}, this.styles.fix, this.props.style);
    let labelStyle = Object.assign(
      {}, this.styles.labelFix,
      this.props.labelStyle);
    return (
      <FlatButton {...this.props} style={style} labelStyle={labelStyle}>
        {this.props.children}
      </FlatButton>
    );
  },
});

/** Simple helper to display the centered box. */
export const Center = React.createClass({
  styles: {
    outer: {
      display: "table",
      width: "100%",
      height: boxHeight,
    },
    inner: {
      display: "table-cell",
      verticalAlign: "middle",
      textAlign: "center",
    },
  },
  render: function() {
    let outerStyle = Object.assign({}, this.styles.outer, this.props.style);
    return (
      <div {...this.props} style={outerStyle}>
        <div style={this.styles.inner}>
          {this.props.children}
        </div>
      </div>
    );
  },
});

/** Inderterminate waiting of some event. */
export const Wait = React.createClass({
  styles: {
    text: {
      color: secondaryColor,
    },
  },
  render: function() {
    return (
      <div>
        <div style={this.styles.text}>{this.props.children}</div>
        <CircularProgress mode="indeterminate" size={2} />
      </div>
    );
  },
});

export const SmallInput = React.createClass({
  styles: {
    smallInput: {
      width: 110,
      marginRight: 10,
      float: "left",
    },
  },
  // Wrap TextField's methods. Seems like this is the recommended way in
  // React: <https://stackoverflow.com/a/25723635>.
  getValue: function() {
    return this.refs && this.refs.input.getValue();
  },
  setValue: function(newValue) {
    return this.refs && this.refs.input.setValue(newValue);
  },
  render: function() {
    const style = Object.assign({}, this.styles.smallInput, this.props.style);
    return <TextField {...this.props} style={style} ref="input" />;
  },
});

export const Section = React.createClass({
  styles: {
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
    },
  },
  render: function() {
    const sectionStyle = Object.assign(
      {},
      this.styles.section,
      this.props.sectionStyle
    );
    return (
      <div>
        <div style={this.styles.header}>{this.props.header}</div>
        <div style={sectionStyle}>{this.props.children}</div>
      </div>
    );
  },
});

/** Just a helper. */
export const CenterSection = React.createClass({
  render: function() {
    return <Center><Paper><Section {...this.props} /></Paper></Center>;
  },
});
