/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */

import "reflect-metadata";
import Jasmine from "jasmine";
import { SpecReporter } from "jasmine-spec-reporter";
import { getSsmParameters, setEnvVars } from "../../../config/jasmine/e2e.util";

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
  const ssmParameters = await getSsmParameters("dereklarson", necessaryParams);

  setEnvVars(ssmParameters);

  const jasmine = new Jasmine({});
  const specReporter = new SpecReporter({ spec: { displayPending: true } });

  jasmine.loadConfig({
    spec_dir: "./compiled_e2e_tests",
    spec_files: [
      "**/*[sS]pec.js",
    ],
    helpers: [],
  });

  (jasmine as any).DEFAULT_TIMEOUT_INTERVAL = 15000;
  jasmine.env.clearReporters();
  jasmine.env.addReporter(specReporter as unknown as jasmine.Reporter);
  jasmine.execute();
})();
