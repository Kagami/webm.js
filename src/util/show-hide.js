import React from "react";

export default React.createClass({
  propTypes: {
    show: React.PropTypes.bool,
    viaCSS: React.PropTypes.bool,
  },
  render: function() {
    if (this.props.viaCSS) {
      const display = this.props.show ? null : {display: "none"};
      return (
        <div style={display}>{this.props.children}</div>
      );
    } else {
      return this.props.show ? this.props.children : null;
    }
  },
});
