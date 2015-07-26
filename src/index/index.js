/**
 * Entry point of the application.
 * @module webm/index
 */

import "babel-core/polyfill";
// FIXME(Kagami): Make sure that in production builds unneeded
// code/widgets are eliminated.
import React from "react";
import {Styles} from "material-ui";
import Upload from "../upload";
// Assets.
// TODO(Kagami): Move `name` setting to the webpack config. See
// <https://github.com/webpack/file-loader/issues/30> for details.
import "file?name=[hash:15].[name].[ext]!./roboto-regular.woff";
import "file?name=[hash:15].[name].[ext]!./roboto-medium.woff";
import "file?name=[hash:15].[name].[ext]!./ribbon.png";

const ThemeManager = new Styles.ThemeManager();

const Main = React.createClass({
  childContextTypes: {
    muiTheme: React.PropTypes.object,
  },
  getChildContext: function() {
    return {muiTheme: ThemeManager.getCurrentTheme()};
  },
  render: function() {
    return (
      <div>
        <Upload/>
      </div>
    );
  },
});

React.render(<Main/>, document.getElementById("main"));
