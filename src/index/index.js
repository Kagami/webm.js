/**
 * Entry point of the application.
 * @module webm/index
 */

// Polyfills.
import "core-js/fn/object/assign";
import "core-js/fn/promise";
// Modules.
import React from "react";
import injectTapEventPlugin from "react-tap-event-plugin";
import {Prober} from "../ffmpeg";
import {ThemeManager, Center, Wait, boxWidth} from "../theme";
import Source from "../source";
import Preview from "../preview";
import Info from "../info";
import Encode from "../encode";
// Assets.
// TODO(Kagami): Move `name` setting to the webpack config. See
// <https://github.com/webpack/file-loader/issues/30> for details.
import "file?name=[hash:10].[name].[ext]!./roboto-regular.woff";
import "file?name=[hash:10].[name].[ext]!./roboto-medium.woff";
import "file?name=[hash:10].[name].[ext]!./ribbon.png";

const styles = {
  container: {
    width: boxWidth,
    margin: "0 auto",
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
    // FIXME(Kagami): Make sure to cancel all outgoing operations or
    // block the clear button while they are in progress.
    this.setState({source: null, info: null, output: null});
  },
  handleInfoLoad: function(info) {
    this.setState({info});
  },
  render: function() {
    const preload = (
      <Center key="preload">
        <Wait>Please wait while webm.js is loading</Wait>
      </Center>
    );
    const source = (
      <Source
        key="source"
        onLoad={this.handleSourceLoad}
      />
    );
    const preview = (
      <Preview
        key="preview"
        source={this.state.source}
        onClear={this.handleSourceClear}
      />
    );
    const info = (
      <Info
        key="info"
        prober={this.state.prober}
        source={this.state.source}
        onLoad={this.handleInfoLoad}
      />
    );
    const encode = (
      <Encode
        key="encode"
        source={this.state.source}
        info={this.state.info}
      />
    );
    const output = (
      <div
        key="output"
      />
    );
    let nodes = [];
    if (this.state.prober) {
      if (this.state.source) {
        nodes.push(preview);
        nodes.push(info);
        if (this.state.info) nodes.push(encode);
        if (this.state.output) nodes.push(output);
      } else {
        nodes.push(source);
      }
    } else {
      nodes.push(preload);
    }
    return <div style={styles.container}>{nodes}</div>;
  },
});

injectTapEventPlugin();
React.render(<Main/>, document.getElementById("main"));
