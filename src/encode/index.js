/**
 * Encoder main module.
 * @module webm/encoder
 */

import React from "react";
import Params from "./params";

export default React.createClass({
  render: function() {
    return (
      <Params source={this.props.source} info={this.props.info} />
    );
  },
});
