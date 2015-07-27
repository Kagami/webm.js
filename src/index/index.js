/**
 * Entry point of the application.
 * @module webm/index
 */

// Polyfills.
import "core-js/fn/object/assign";
import "core-js/fn/promise";
// Modules.
import React from "react";
import {Prober} from "../ffmpeg";
import {ThemeManager, Center, Wait, boxWidth} from "../theme";
import Source from "../source";
import Preview from "../preview";
// Assets.
// TODO(Kagami): Move `name` setting to the webpack config. See
// <https://github.com/webpack/file-loader/issues/30> for details.
import "file?name=[hash:10].[name].[ext]!./roboto-regular.woff";
import "file?name=[hash:10].[name].[ext]!./roboto-medium.woff";
import "file?name=[hash:10].[name].[ext]!./ribbon.png";

const styles = {
  box: {
    width: boxWidth,
    margin: "0 auto",
    textAlign: "center",
    color: "#999",
  },
};

const Main = React.createClass({
  childContextTypes: {
    muiTheme: React.PropTypes.object,
  },
  getInitialState: function() {
    return {};
  },
  getChildContext: function() {
    return {muiTheme: ThemeManager.getCurrentTheme()};
  },
  componentDidMount: function() {
    Prober.spawn().then(prober => {
      this.setState({prober});
    }).catch(() => {
      // FIXME(Kagami): Display error in UI.
    });
  },
  handleSourceLoad: function(source) {
    this.setState({source});
  },
  handleSourceClear: function() {
    this.setState({source: null});
  },
  render: function() {
    const boxInner = this.state.prober ? (
      this.state.source ? (
        <Preview
          source={this.state.source}
          onClear={this.handleSourceClear}
        />
      ) : (
        <Source onLoad={this.handleSourceLoad} />
      )
    ) : (
      <Center><Wait>Please wait while webm.js is loading</Wait></Center>
    );
    return <div style={styles.box}>{boxInner}</div>;
  },
});

React.render(<Main/>, document.getElementById("main"));
