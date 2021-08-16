/* eslint-disable @typescript-eslint/no-floating-promises */

import "reflect-metadata";
import Jasmine from "jasmine";
import { SpecReporter } from "jasmine-spec-reporter";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { getAccessTokenByEmail, getSsmParameters, setEnvVars } from "../../../e2e/util";
import { createRandomUser } from "./util";

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
  "image-s3-bucket-name",
  "image-s3-bucket-name",
  "user-added-to-team-sns-topic-arn",
  "user-removed-from-team-sns-topic-arn",
  "user-added-to-group-sns-topic-arn",
  "user-removed-from-group-sns-topic-arn",
  "user-added-to-meeting-sns-topic-arn",
  "user-removed-from-meeting-sns-topic-arn",
  "user-added-as-friend-sns-topic-arn",
  "team-created-sns-topic-arn",
  "core-testing-sns-event-table-name",
];

(async () => {
  const initialEnvVals = await getSsmParameters(environment, necessaryParams);
  initialEnvVals.baseUrl = `https://${environment === "dev" ? "develop" : environment}.yacchat.com/core`;

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
  jasmineInstance.env.addReporter(specReporter as unknown as jasmine.CustomReporter);
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  jasmineInstance.execute();
})();
