const BaseConfig = require("./webpack.config.base")

class ReleaseConfig extends BaseConfig {
  constructor() {
    super()

    this.mode = "production"
  }
}

module.exports = new ReleaseConfig()