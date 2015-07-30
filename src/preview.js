/**
 * Input file preview.
 * @module webm/preview
 */

import React from "react";
import {InlineFlatButton, Center, boxWidth, boxHeight} from "./theme";

const styles = {
  outer: {
    marginBottom: 10,
  },
  header: {
    marginBottom: 10,
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
      <Center style={styles.outer}>
        <div style={styles.header}>
          <span>{this.props.source.name} was selected, </span>
          <InlineFlatButton
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
      </Center>
    );
  },
});
