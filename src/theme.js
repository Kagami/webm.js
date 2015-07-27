/**
 * webm.js own theme-related code.
 * @module webm/theme
 */

import React from "react";
import mui from "material-ui";

export const ThemeManager = new mui.Styles.ThemeManager();

// Some theme constants.
// 16:9, reasonably large and 960px is popular grid width.
export const boxWidth = 960;
export const boxHeight = 540;

// Fixed FlatButton since it's not possible to style it via the theme.
export const FlatButton = React.createClass({
  styles: {
    fix: {
      minWidth: 0,
      fontSize: "inherit",
      textTransform: "none",
      // Cause wrong aligning in Firefox.
      transform: "none",
    },
  },
  render: function() {
    let style = Object.assign({}, this.styles.fix, this.props.style);
    return (
      <mui.FlatButton {...this.props} style={style}>
        {this.props.children}
      </mui.FlatButton>
    );
  },
});

// Simple helper to display the centered box.
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

// Inderterminate waiting of some event.
export const Wait = React.createClass({
  render: function() {
    return (
      <div>
        <div>{this.props.children}</div>
        <mui.CircularProgress mode="indeterminate" size={2} />
      </div>
    );
  },
});
