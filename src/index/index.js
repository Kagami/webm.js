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
import Params from "../params";
import Encode from "../encode";
// Assets.
// TODO(Kagami): Move `name` setting to the webpack config. See
// <https://github.com/webpack/file-loader/issues/30> for details.
import "file?name=[hash:10].[name].[ext]!./roboto-regular.woff";
import "file?name=[hash:10].[name].[ext]!./roboto-medium.woff";
import "file?name=[hash:10].[name].[ext]!./ribbon.png";

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
  styles: {
    container: {
      width: boxWidth,
      margin: "0 auto",
    },
  },
  handleSourceLoad: function(source) {
    this.setState({source});
  },
  handleSourceClear: function() {
    // FIXME(Kagami): Make sure to cancel all outgoing operations or
    // block the clear button while they are in progress.
    this.setState({source: null, info: null});
  },
  handleInfoLoad: function(info) {
    this.setState({info});
  },
  getPreloadNode: function() {
    return this.state.prober ? null : (
      <Center><Wait>Please wait while webm.js is loading</Wait></Center>
    );
  },
  getSourceNode: function() {
    return this.state.prober && !this.state.source ? (
      <Source onLoad={this.handleSourceLoad} />
    ) : null;
  },
  getPreviewNode: function() {
    return this.state.source ? (
      <Preview source={this.state.source} onClear={this.handleSourceClear} />
    ) : null;
  },
  getInfoNode: function() {
    return this.state.source ? (
      <Info
        prober={this.state.prober}
        source={this.state.source}
        onLoad={this.handleInfoLoad}
      />
    ) : null;
  },
  getParamsNode: function() {
    return this.state.info ? (
      <Params source={this.state.source} info={this.state.info} />
    ) : null;
  },
  getEncodeNode: function() {
    return this.state.encoding ? (
      <Encode info={this.state.info} />
    ) : null;
  },
  render: function() {
    return (
      <div style={this.styles.container}>
        {this.getPreloadNode()}
        {this.getSourceNode()}
        {this.getPreviewNode()}
        {this.getInfoNode()}
        {this.getParamsNode()}
        {this.getEncodeNode()}
      </div>
    );
  },
});

injectTapEventPlugin();
React.render(<Main/>, document.getElementById("main"));
