const path = require("path");
const NodemonPlugin = require("nodemon-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(gif|png|jpe?g|svg|xml)$/i,
        use: "file-loader",
      },
    ],
  },
  entry: "./public/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new NodemonPlugin({
      script: "./src/index.js",
      watch: path.resolve("./src"),
    }),
  ],
  optimization: { minimizer: [] },
};
