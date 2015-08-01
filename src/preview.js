/**
 * Input file preview.
 * @module webm/preview
 */

import React from "react";
import {InlineButton, boxWidth, boxHeight, secondaryColor} from "./theme";

const styles = {
  outer: {
    textAlign: "center",
    marginBottom: 10,
  },
  header: {
    color: secondaryColor,
    marginBottom: 2,
  },
  video: {
    display: "block",
    maxWidth: boxWidth,
    maxHeight: boxHeight,
    margin: "0 auto",
  },
};

export default React.createClass({
  render: function() {
    // TODO(Kagami): Handle case when we can't preview video/audio.
    return (
      <div style={styles.outer}>
        <div style={styles.header}>
          <span>{this.props.source.name} was selected, </span>
          <InlineButton
            primary
            onClick={this.props.onClear}
            label="clear choice"
          />
        </div>
        <video
          src={this.props.source.url}
          style={styles.video}
          controls
        />
      </div>
    );
  },
});
