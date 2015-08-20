/**
 * Entry point of the application.
 * @module webm/index
 */

// Polyfills.
import "core-js/fn/object/assign";
import "core-js/fn/number/is-finite";
import "core-js/fn/number/is-integer";
import "core-js/fn/promise";
// Modules.
import React from "react";
import injectTapEventPlugin from "react-tap-event-plugin";
import {Prober} from "../ffmpeg";
import {
  themeManager, Container, Center, Wait, CenterSection, InlineButton,
} from "../theme";
import Source from "../source";
import Info from "../info";
import Params from "../params";
import Encode from "../encode";
import {ShowHide, WORKERFS_DIR, getSafeFilename, download} from "../util";
// Assets.
// TODO(Kagami): Move `name` setting to the webpack config. See
// <https://github.com/webpack/file-loader/issues/30> for details.
import "file?name=[hash:10].[name].[ext]!./roboto-regular.woff";
import "file?name=[hash:10].[name].[ext]!./roboto-medium.woff";
import "file?name=[hash:10].[name].[ext]!./ribbon.png";
import "file?name=[hash:10].[name].[ext]!./logo.png";
const SUB_FONT_NAME = "default.ttf";
const SUB_FONT_URL = require(
  "file?name=[hash:10].[name].[ext]!" +
  "./liberationsans-regular.ttf"
);

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
    download(SUB_FONT_URL).then(data => {
      const subFont = {name: SUB_FONT_NAME, data};
      this.setState({subFont});
      return Prober.spawn();
    }).then(prober => {
      this.setState({prober});
    }).catch(e => {
      if (window.console) console.error(e);
      this.setState({loadingError: true});
    });
  },
  getPreloadNode: function() {
    return this.state.loadingError ? (
      <CenterSection header="loading error">
        <span>Error occured while loading webm.js, try to </span>
        <InlineButton
          primary
          label="reload the page"
          onClick={this.handleReload}
        />.
      </CenterSection>
    ) : this.state.prober ? null : (
      <Center><Wait>Please wait while webm.js is loading</Wait></Center>
    );
  },
  getSourceNode: function() {
    return this.state.prober && !this.state.source ? (
      <Source onLoad={this.handleSourceLoad} />
    ) : null;
  },
  getInfoNode: function() {
    return this.state.source ? (
      <ShowHide show={!this.state.params} viaCSS>
        <Info
          prober={this.state.prober}
          source={this.state.source}
          onLoad={this.handleInfoLoad}
          onClear={this.handleSourceClear}
          onParams={this.handleParamsChange}
        />
      </ShowHide>
    ) : null;
  },
  getParamsNode: function() {
    return this.state.info ? (
      <ShowHide show={!this.state.params} viaCSS>
        <Params
          ref="params"
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
        info={this.state.info}
        params={this.state.params}
        subFont={this.state.subFont}
        onCancel={this.handleEncodeCancel}
      />
    ) : null;
  },
  handleReload: function() {
    location.reload();
  },
  handleSourceLoad: function(source) {
    const origName = source.name;
    const name = getSafeFilename(origName);
    const path = WORKERFS_DIR + "/" + name;
    source = Object.assign({}, source, {name, path, origName});
    this.setState({source});
  },
  handleSourceClear: function() {
    this.setState({source: null, info: null, params: null});
  },
  handleParamsChange: function(opts) {
    this.refs.params.handleUI(opts);
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
        {this.getInfoNode()}
        {this.getParamsNode()}
        {this.getEncodeNode()}
      </Container>
    );
  },
});

injectTapEventPlugin();
React.render(<Main/>, document.getElementById("main"));
