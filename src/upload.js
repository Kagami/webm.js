/**
 * Upload & preview input file widget.
 * @module webm/upload
 */

import React from "react";
import {FlatButton} from "material-ui";
import "./ffmpeg";

const styles = {
  box: {
    display: "table",
    width: "960px",
    height: "540px",
    marginTop: "50px",
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center",
    border: "2px dashed #ccc",
    color: "#999",
    cursor: "pointer",
  },
  form: {
    display: "table-cell",
    verticalAlign: "middle",
  },
  flatButtonFix: {
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
    // const Progress = (
    //   <CircularProgress mode="indeterminate" size={2} />
    // );
    const Form = (
      <div style={styles.form} onClick={this.handleBoxClick}>
        <input type="file" style={styles.hidden} ref="file" />
        Click/drag your input video here<br/>
        or borrow a{' '}
        <FlatButton
            primary
            onClick={this.handleSampleClick}
            style={styles.flatButtonFix}>
          sample video
        </FlatButton>
      </div>
    );
    return (
      <div style={styles.box}>
        {Form}
      </div>
    );
  },
});
