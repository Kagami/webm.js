/**
 * Input file preview.
 * @module webm/preview
 */

import React from "react";
import {FlatButton, Center} from "./theme";

const styles = {
  header: {
    marginBottom: 10,
  },
  video: {
    display: "block",
    maxWidth: 960,
    maxHeight: 540,
    margin: "0 auto",
  },
};

export default React.createClass({
  render: function() {
    // TODO(Kagami): Handle case when we can't preview video/audio.
    return (
      <Center>
        <div style={styles.header}>
          {this.props.source.name} was selected,{' '}
          <FlatButton primary onClick={this.props.onClear}>
            clear choice
          </FlatButton>
        </div>
        <video
          src={this.props.source.url}
          style={styles.video}
          autoPlay
          controls
        />
      </Center>
    );
  },
});
