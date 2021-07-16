/* eslint-disable @typescript-eslint/no-floating-promises */

import "reflect-metadata";
import Jasmine from "jasmine";
import { SpecReporter } from "jasmine-spec-reporter";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { createRandomUser, getAccessTokenByEmail, getSsmParameters, setEnvVars } from "../../../e2e/util";

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
  const initialEnvVals = await getSsmParameters(environment, necessaryParams);
  initialEnvVals.baseUrl = `https://${environment}.yacchat.com/entity-service`;

  setEnvVars(initialEnvVals);

  const { user } = await createRandomUser();
  const { accessToken } = await getAccessTokenByEmail(user.email);

  const userEnvVars = {
    userId: user.id,
    userEmail: user.email,
    accessToken,
  };

  setEnvVars(userEnvVars);

  const jasmineInstance = new Jasmine({});
  const specReporter = new SpecReporter({ spec: { displayPending: true } });

  jasmineInstance.loadConfig({
    spec_dir: "./compiled_e2e_tests",
    spec_files: [
      "**/*[sS]pec.js",
    ],
    helpers: [],
  });

  jasmineInstance.env.clearReporters();
  jasmineInstance.env.addReporter(specReporter as unknown as any);
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
  jasmineInstance.execute();
})();
