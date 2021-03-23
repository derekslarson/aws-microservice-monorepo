const path = require("path")
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

class WebpackConfig {
  constructor() {
    this.stats = {
      errorDetails: true,
      colors: true,
      modules: true,
      reasons: true,
    };

    this.mode = "production";
    
    this.target = "node";
    
    this.entry = "./index.ts";

    this.output = {
      libraryTarget: "commonjs2",
      path: path.resolve(__dirname, "../dist"),
      filename: "index.js",
    };

    this.resolve = {
      extensions: [ ".js", ".ts", ".json" ],
    };

    this.module = {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
        }
      ],
    };

    this.externals = [/\/tmp\/.+/]

    this.optimization = {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            keep_classnames: true,
            keep_fnames: true
          }
        })
      ]
    }

    this.plugins = [ 
      new CaseSensitivePathsPlugin()
    ];
  };
}

module.exports = new WebpackConfig()
