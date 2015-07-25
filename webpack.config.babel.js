import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
  entry: "./src/index",
  output: {
    path: path.join(__dirname, "dist"),
    filename: "webm.js",
  },
  module: {
    loaders: [
      {
        test: new RegExp("^" + path.join(__dirname, "src", ".+\\.js$")),
        loader: "babel",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join("src", "index", "index.html"),
    }),
  ],
};
