/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */

import "reflect-metadata";
import Jasmine from "jasmine";
import { SpecReporter } from "jasmine-spec-reporter";
import yargs from "yargs/yargs";

import { hideBin } from "yargs/helpers";
import { getSsmParameters, setEnvVars } from "../../../config/jasmine/e2e.util";

const { argv } = yargs(hideBin(process.argv));
const { environment } = argv as { environment?: string; };

if (!environment) {
  throw new Error("--environment is required");
}

const necessaryParams = [
  "secret",
  "user-pool-id",
  "user-pool-domain-url",
  "yac-client-id",
  "yac-client-secret",
  "yac-client-redirect-uri",
  "core-table-name",
];

(async () => {
  const envVars = await getSsmParameters(environment, necessaryParams);
  envVars.environment = environment;

  setEnvVars(envVars);

  const jasmine = new Jasmine({});
  const specReporter = new SpecReporter({ spec: { displayPending: true } });

  jasmine.loadConfig({
    spec_dir: "./compiled_e2e_tests",
    spec_files: [
      "**/*[sS]pec.js",
    ],
    helpers: [],
  });

  jasmine.env.clearReporters();
  jasmine.env.addReporter(specReporter as unknown as jasmine.Reporter);
  jasmine.execute();
})();
