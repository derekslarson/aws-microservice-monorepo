const BaseConfig = require("./webpack.config.base")

class ReleaseConfig extends BaseConfig {
  constructor() {
    super()
  }
}

module.exports = new ReleaseConfig()