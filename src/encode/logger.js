/**
 * Encoder logging component.
 * @module webm/encode/logger
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
    // TODO(Kagami): Scroll logs to bottom.
    const tabs = (this.props.logs || []).map(log =>
      <Tab label={log.key} key={log.key}>
        <pre style={this.styles.tabInner}>{log.contents}</pre>
      </Tab>
    );
    return <Paper><Tabs>{tabs}</Tabs></Paper>;
  },
});
