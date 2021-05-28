require("reflect-metadata");
const Jasmine = require("jasmine");
const { SpecReporter } = require("jasmine-spec-reporter");

const jasmine = new Jasmine();
const specReporter = new SpecReporter({ spec: { displayPending: true }});

jasmine.loadConfig({
  spec_dir: "compiled_tests",
  spec_files: [
    "**/*[sS]pec.js",
    "!**/*.ts"
  ],
  helpers: [],
});

jasmine.env.clearReporters();
jasmine.env.addReporter(specReporter);
jasmine.execute();
