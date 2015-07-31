/**
 * webm.js theme-related code and components.
 * @module webm/theme
 */

import React from "react";
import mui from "material-ui";

export const ThemeManager = new mui.Styles.ThemeManager();

// Some theme constants.
// 16:9, reasonably large and 960px is popular grid width.
export const boxWidth = 960;
export const boxHeight = 540;
export const secondaryColor = "#999";

export const InlineButton = React.createClass({
  styles: {
    fix: {
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
      <mui.FlatButton {...this.props} style={style} labelStyle={labelStyle}>
        {this.props.children}
      </mui.FlatButton>
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
        <mui.CircularProgress mode="indeterminate" size={2} />
      </div>
    );
  },
});

export const SmallInput = React.createClass({
  styles: {
    smallInput: {
      width: 110,
      marginRight: 10,
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
    let style = Object.assign({}, this.styles.smallInput, this.props.style);
    return <mui.TextField {...this.props} style={style} ref="input" />;
  },
});
