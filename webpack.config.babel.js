import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";

function insrc(...parts) {
  return new RegExp("^" + path.join(__dirname, "src", ...parts) + "$");
}

export default {
  entry: "./src/index",
  output: {
    path: path.join(__dirname, "dist"),
    filename: "webm.js",
  },
  module: {
    loaders: [
      {test: insrc(".+\\.js"), loader: "babel"},
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join("src", "index", "index.html"),
      getNameBySuffix: function(stats, suffix) {
        return stats.assets.find(
          asset =>
            asset.name === suffix ||
            asset.name.slice(-suffix.length - 1) === "." + suffix
        ).name;
      },
    }),
  ],
};
