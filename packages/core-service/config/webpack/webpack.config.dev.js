const BaseConfig = require("./webpack.config.base")

class DevConfig extends BaseConfig {
  constructor() {
    super()

    this.output.devtoolModuleFilenameTemplate = "[absolute-resource-path]";
    this.output.devtoolFallbackModuleFilenameTemplate = "[absolute-resource-path]?[hash]";
    this.devtool = "source-map";
  }
}

module.exports = new DevConfig()
