/**
 * Upload file widget.
 * @module webm/upload
 */

import React from "react";
import {FlatButton} from "material-ui";

const styles = {
  border: {
    display: "table",
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    cursor: "pointer",
    border: "2px dashed #ccc",
  },
  form: {
    display: "table-cell",
    verticalAlign: "middle",
  },
  buttonFix: {
    fontSize: "inherit",
    textTransform: "none",
    // Cause wrong aligning in Firefox.
    transform: "none",
  },
  hidden: {
    display: "none",
  },
};

export default React.createClass({
  handleBoxClick: function() {
    React.findDOMNode(this.refs.file).click();
  },
  handleSampleClick: function(e) {
    e.stopPropagation();
  },
  render: function() {
    return (
      <div style={styles.border}>
        <div style={styles.form} onClick={this.handleBoxClick}>
          <input type="file" style={styles.hidden} ref="file" />
          Click/drag your input video here<br/>
          or borrow a{' '}
          <FlatButton
              primary
              onClick={this.handleSampleClick}
              style={styles.buttonFix}>
            sample video
          </FlatButton>
        </div>
      </div>
    );
  },
});
