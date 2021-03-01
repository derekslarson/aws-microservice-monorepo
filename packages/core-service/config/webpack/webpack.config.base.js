const path = require("path")
const fs = require("fs")
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const NpmDtsPlugin = require("npm-dts-webpack-plugin");

class BaseConfig {
  constructor() {
    this.stats = {
      errorDetails: true,
      colors: true,
      modules: true,
      reasons: true,
    };

    this.entry = "./src/index.ts";

    this.output = {
      libraryTarget: "commonjs2",
      path: path.resolve(__dirname, `../../dist`),
      filename: "[name].js",
    };

    this.resolve = {
      extensions: [ ".js", ".ts", ".json" ],
    };

    this.externals = [ /^[^.]/ ];

    this.module = {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
        },
        {
          test: /\.json$/,
          use: "json-loader",
        },
      ],
    };

    this.plugins = [ 
      new CaseSensitivePathsPlugin(),
      new NpmDtsPlugin()
    ];
  };
}

module.exports = BaseConfig
