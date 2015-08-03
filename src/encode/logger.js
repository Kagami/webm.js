/**
 * Encoder logging component.
 * @module webm/encode/logger
 */

import React from "react";
import {Paper, Tabs, Tab} from "material-ui";

const Output = React.createClass({
  componentDidUpdate: function() {
    const node = this.getDOMNode();
    node.scrollTop = node.scrollHeight;
  },
  styles: {
    inner: {
      padding: "8px",
      backgroundColor: "#f8f8f8",
      height: 500,
      margin: 0,
      overflowY: "scroll",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
    },
  },
  render: function() {
    return <pre style={this.styles.inner}>{this.props.contents}</pre>;
  },
});

export default React.createClass({
  styles: {
    tabs: {
      backgroundColor: "#fff",
    },
    tab: {
      color: "#000",
      borderRight: "1px solid #e0e0e0",
      borderBottom: "1px solid #e0e0e0",
    },
  },
  render: function() {
    const tabs = (this.props.logs || []).map(log =>
      <Tab style={this.styles.tab} label={log.key} key={log.key}>
        <Output contents={log.contents} />
      </Tab>
    );
    return (
      <Paper>
        <Tabs tabItemContainerStyle={this.styles.tabs}>{tabs}</Tabs>
      </Paper>
    );
  },
});
