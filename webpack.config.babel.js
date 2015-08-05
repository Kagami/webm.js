import path from "path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";

function insrc(...parts) {
  return new RegExp("^" + path.join(__dirname, "src", ...parts) + "$");
}

function getNameBySuffix(stats, suffix) {
  return stats.assets.find(asset =>
    asset.name === suffix ||
    asset.name.slice(-suffix.length - 1) === "." + suffix
  ).name;
}

const DEBUG = process.env.NODE_ENV !== "production";
const JS_NAME = DEBUG ? "webm.js" : "[chunkhash:10].webm.js";
const HTML_MINIFIER = DEBUG ? false : {
  removeComments: true,
  collapseWhitespace: true,
  minifyCSS: true,
};
const COMMON_PLUGINS = [
  new HtmlWebpackPlugin({
    minify: HTML_MINIFIER,
    template: path.join("src", "index", "index.html"),
    getNameBySuffix,
  }),
];
const PLUGINS = DEBUG ? COMMON_PLUGINS : COMMON_PLUGINS.concat([
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.optimize.UglifyJsPlugin({
    output: {comments: false},
    compress: {warnings: false},
  }),
]);

export default {
  entry: "./src/index",
  output: {
    path: path.join(__dirname, "dist"),
    filename: JS_NAME,
  },
  module: {
    loaders: [
      {test: insrc(".+\\.js"), loader: "babel"},
    ],
  },
  plugins: PLUGINS,
};
