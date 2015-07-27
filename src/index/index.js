/**
 * Entry point of the application.
 * @module webm/index
 */

import "babel-core/polyfill";
// FIXME(Kagami): Make sure that in production builds unneeded
// code/widgets are eliminated.
import React from "react";
import {Styles, CircularProgress} from "material-ui";
import {Prober} from "../ffmpeg";
import Upload from "../upload";
// Assets.
// TODO(Kagami): Move `name` setting to the webpack config. See
// <https://github.com/webpack/file-loader/issues/30> for details.
import "file?name=[hash:15].[name].[ext]!./roboto-regular.woff";
import "file?name=[hash:15].[name].[ext]!./roboto-medium.woff";
import "file?name=[hash:15].[name].[ext]!./ribbon.png";

const ThemeManager = new Styles.ThemeManager();

const styles = {
  box: {
    display: "table",
    width: "960px",
    height: "540px",
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center",
    color: "#999",
  },
  center: {
    height: "100%",
    display: "table-cell",
    verticalAlign: "middle",
  },
};

const Main = React.createClass({
  childContextTypes: {
    muiTheme: React.PropTypes.object,
  },
  getChildContext: function() {
    return {muiTheme: ThemeManager.getCurrentTheme()};
  },
  getInitialState: function() {
    return {};
  },
  componentDidMount: function() {
    Prober.spawn().then(prober => {
      this.setState({prober});
    }).catch(e => {
      // TODO(Kagami): Display errors in UI.
      console.error(e);
    });
  },
  render: function() {
    const boxInner = this.state.prober ? <Upload/> : (
      <div style={styles.center}>
        Please wait while webm.js is loading<br/>
        <CircularProgress mode="indeterminate" size={2} />
      </div>
    );
    return (
      <div>
        <div style={styles.box}>{boxInner}</div>
      </div>
    );
  },
});

React.render(<Main/>, document.getElementById("main"));
