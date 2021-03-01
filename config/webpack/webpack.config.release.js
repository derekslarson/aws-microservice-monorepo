const BaseConfig = require("./webpack.config.base")

class ReleaseConfig extends BaseConfig {
  constructor(env) {
    super(env)
  }
}

module.exports = (env) => new ReleaseConfig(env)