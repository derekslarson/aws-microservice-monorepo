const devConf = {
    rollup(config, options) {
        return config;
    },
};

const prodConf = {
    // optimize the bundling for only the handlers
    // this means: bundle every handler with its dependencies in the .aws-dist/ folder
    // with a tree like: .aws-dist/ > handler1/index.js ~ handler2/index.js ~ handler3/index/js ~k node_modules/
    rollup(config, options) {
        return config;
    },
};
module.exports = process.env.NODE_ENV === "production" ? prodConf : devConf;
