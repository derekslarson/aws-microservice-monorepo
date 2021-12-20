const BaseConfig = require("./webpack.config.base")

class DevConfig extends BaseConfig {
  constructor() {
    super()

    this.mode = "development"
    this.output.devtoolModuleFilenameTemplate = "[absolute-resource-path]";
    this.output.devtoolFallbackModuleFilenameTemplate = "[absolute-resource-path]?[hash]";
  }
}

module.exports = new DevConfig()
