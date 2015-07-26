import "babel-core/polyfill";
// FIXME(Kagami): Make sure that in production builds unneeded
// code/widgets are eliminated.
import React from "react";
import {Styles, Checkbox} from "material-ui";
// Assets.
import "./roboto-regular.woff";
import "./roboto-medium.woff";
import "./ribbon.png";

const ThemeManager = new Styles.ThemeManager();

const Main = React.createClass({
  childContextTypes: {
    muiTheme: React.PropTypes.object,
  },

  getChildContext: function() {
    return {muiTheme: ThemeManager.getCurrentTheme()};
  },

  render: function() {
    return <Checkbox label="test" />;
  },
});

React.render(<Main/>, document.getElementById("main"));
