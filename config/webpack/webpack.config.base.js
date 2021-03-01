const path = require("path")
const fs = require("fs")
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");

class BaseConfig {
  constructor(env) {
    this.stats = {
      errorDetails: true,
      colors: true,
      modules: true,
      reasons: true,
    };

    const handlers = fs.readdirSync("./src/handlers");

    const entries = {};

    for (const filename of handlers) {
      // Each file in handlers directory is an "entry" point
      if (!filename.match(/\.spec\.js/i)) {
        entries[filename.split(".")[0]] = `./src/handlers/${filename}`;
      }
    }

    this.entry = entries;

    this.output = {
      libraryTarget: "commonjs2",
      path: path.resolve(__dirname, `../../packages/${env.package}/dist/handlers`),
      // We need each handler in its own folder so that we can upload it via CDK (it needs a directory)
      filename: "[name]/[name].js",
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

    this.plugins = [ new CaseSensitivePathsPlugin() ];
  };
}

module.exports = BaseConfig
