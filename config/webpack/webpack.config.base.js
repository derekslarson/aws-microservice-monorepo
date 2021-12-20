const path = require("path")
const fs = require("fs")
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

class BaseConfig {
  constructor() {
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
      path: path.resolve(process.cwd(), `./dist/handlers`),
      // We need each handler in its own folder so that we can upload it via CDK (it needs a directory)
      filename: "[name]/[name].js",
    };

    this.resolve = {
      extensions: [ ".js", ".ts" ],
    };

    // this.externals = [ /^((?!(@yac|\.)).)/ ];

    this.target = "node";
    this.externals = [ /^aws-sdk/ ];

    this.module = {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
        }
      ],
    };

    this.plugins = [ 
      new CaseSensitivePathsPlugin(),
    ];

    this.optimization = {
      minimize: true,
      usedExports: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            keep_classnames: true,
            keep_fnames: true
          }
        })
      ]
    }
  };
}

module.exports = BaseConfig
