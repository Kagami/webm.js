/**
 * Download encode result.
 * @module webm/encode/download
 */

import React from "react";
import {RaisedButton} from "../theme";

const isIE = !!navigator.msSaveOrOpenBlob;
const isSafari = !isIE && (function() {
  const a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
  return !("download" in a);
})();

export default React.createClass({
  handleClick: function() {
    if (isIE) {
      navigator.msSaveOrOpenBlob(this.props.url, this.props.name);
    } else if (isSafari) {
      location.href = this.props.url;
    }
  },
  render: function() {
    return (isIE || isSafari) ? (
      <RaisedButton {...this.props} onClick={this.handleClick} />
    ) : (
      <a href={this.props.url} download={this.props.name}>
        <RaisedButton {...this.props} />
      </a>
    );
  },
});
