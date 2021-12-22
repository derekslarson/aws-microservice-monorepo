/* eslint-disable no-return-assign */
import path from "path";
import fs from "fs";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import { Configuration, Entry } from "webpack";

const handlerFileNames = fs.readdirSync("./src/handlers");

const entryObject: Entry = {};
handlerFileNames.forEach((fileName) => entryObject[fileName.split(".")[0]] = `./src/handlers/${fileName}`);

const config: Configuration = {
  mode: "production",
  target: "node",
  resolve: { extensions: [ ".js", ".ts" ] },
  // aws-sdk is present in the execution environment by default
  externals: [ /^aws-sdk/ ],
  entry: entryObject,
  output: {
    libraryTarget: "commonjs2",
    path: path.resolve(process.cwd(), "./dist/handlers"),
    // We need each handler in its own folder so that we can upload it via CDK (it needs a directory)
    filename: "[name]/[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
      },
    ],
  },
  plugins: [ new CaseSensitivePathsPlugin() ],
  optimization: {
    usedExports: true,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true,
        },
      }),
    ],
  },
  stats: {
    errorDetails: true,
    colors: true,
    modules: true,
    reasons: true,
  },
};

export default config;
