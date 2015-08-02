/**
 * Encoder log.
 * @module webm/encode/log
 */

import React from "react";
import {Paper, Tabs, Tab} from "material-ui";

export default React.createClass({
  styles: {
    tabInner: {
      padding: "8px",
      backgroundColor: "#f8f8f8",
      height: 300,
      margin: 0,
      overflowY: "scroll",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
    },
  },
  render: function() {
    return (
      <Paper>
        <Tabs>
          <Tab label="main">
            <pre style={this.styles.tabInner}></pre>
          </Tab>
          <Tab label="audio" />
          <Tab label="video 1" />
          <Tab label="video 2" />
          <Tab label="video 3" />
          <Tab label="video 4" />
        </Tabs>
      </Paper>
    );
  },
});
