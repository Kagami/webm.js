/**
 * Entry point of the application.
 * @module webm/index
 */

// Polyfills.
import "core-js/fn/object/assign";
import "core-js/fn/number/is-finite";
import "core-js/fn/number/is-integer";
import "core-js/fn/number/max-safe-integer";
import "core-js/fn/promise";
// Modules.
import React from "react";
import injectTapEventPlugin from "react-tap-event-plugin";
import {Prober} from "../ffmpeg";
import {themeManager, Container, Center, Wait} from "../theme";
import Source from "../source";
import Preview from "../preview";
import Info from "../info";
import Params from "../params";
import Encode from "../encode";
import {ShowHide} from "../util";
// Assets.
// TODO(Kagami): Move `name` setting to the webpack config. See
// <https://github.com/webpack/file-loader/issues/30> for details.
import "file?name=[hash:10].[name].[ext]!./roboto-regular.woff";
import "file?name=[hash:10].[name].[ext]!./roboto-medium.woff";
import "file?name=[hash:10].[name].[ext]!./ribbon.png";
import "file?name=[hash:10].[name].[ext]!./logo.png";

const Main = React.createClass({
  childContextTypes: {
    muiTheme: React.PropTypes.object,
  },
  getInitialState: function() {
    return {};
  },
  getChildContext: function() {
    return {muiTheme: themeManager.getCurrentTheme()};
  },
  componentDidMount: function() {
    Prober.spawn().then(prober => {
      this.setState({prober});
    }).catch(e => {
      // FIXME(Kagami): Display error in UI.
      console.error(e);
    });
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
      <ShowHide show={!this.state.params} viaCSS>
        <Preview source={this.state.source} onClear={this.handleSourceClear} />
      </ShowHide>
    ) : null;
  },
  getInfoNode: function() {
    return this.state.source ? (
      <ShowHide show={!this.state.params} viaCSS>
        <Info
          prober={this.state.prober}
          source={this.state.source}
          onLoad={this.handleInfoLoad}
        />
      </ShowHide>
    ) : null;
  },
  getParamsNode: function() {
    return this.state.info ? (
      <ShowHide show={!this.state.params} viaCSS>
        <Params
          source={this.state.source}
          info={this.state.info}
          onReady={this.handleParamsReady}
        />
      </ShowHide>
    ) : null;
  },
  getEncodeNode: function() {
    return this.state.params ? (
      <Encode
        source={this.state.source}
        params={this.state.params}
        onCancel={this.handleEncodeCancel}
      />
    ) : null;
  },
  handleSourceLoad: function(source) {
    this.setState({source});
  },
  handleSourceClear: function() {
    // FIXME(Kagami): Make sure to cancel all outgoing operations or
    // block the clear button while they are in progress.
    this.setState({source: null, info: null, params: null});
  },
  handleInfoLoad: function(info) {
    this.setState({info});
  },
  handleParamsReady: function(params) {
    this.setState({params});
  },
  handleEncodeCancel: function() {
    this.setState({params: null});
  },
  render: function() {
    return (
      <Container>
        {this.getPreloadNode()}
        {this.getSourceNode()}
        {this.getPreviewNode()}
        {this.getInfoNode()}
        {this.getParamsNode()}
        {this.getEncodeNode()}
      </Container>
    );
  },
});

injectTapEventPlugin();
React.render(<Main/>, document.getElementById("main"));
