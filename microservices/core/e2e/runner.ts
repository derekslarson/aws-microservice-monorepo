/* eslint-disable @typescript-eslint/no-floating-promises */

import "reflect-metadata";
// import Jasmine from "jasmine";
// import { SpecReporter } from "jasmine-spec-reporter";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
// import { createRandomAuthServiceUser, getAccessTokenByEmail, getExportsByEnvironment, setEnvVars } from "../../../e2e/util";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { getExportsByEnvironment } from "../../../e2e/util";

const { argv } = yargs(hideBin(process.argv));
const { environment } = argv as { environment?: string; };

if (!environment) {
  throw new Error("--environment is required");
}


(async () => {
  const exports = await getExportsByEnvironment(environment);

  const exportNames = generateExportNames(environment);

  console.log("exports[exportNames.MessageCreatedSnsTopicArn]:\n", exports[exportNames.MessageCreatedSnsTopicArn])
  // const initialEnvVals: Record<string, string> = {};
  
  // initialEnvVals.baseUrl = `https://${environment === "dev" ? "develop" : environment}.yacchat.com/core`;

  // setEnvVars(initialEnvVals);

  // const user = await createRandomAuthServiceUser();

  // const { accessToken } = await getAccessTokenByEmail(user.email);

  // const userEnvVars = {
  //   userId: user.id,
  //   userEmail: user.email,
  //   accessToken,
  // };

  // setEnvVars(userEnvVars);

  // const jasmineInstance = new Jasmine({});
  // const specReporter = new SpecReporter({ spec: { displayPending: true } });

  // jasmineInstance.loadConfig({
  //   spec_dir: "./compiled_e2e_tests",
  //   spec_files: [
  //     "**/*[sS]pec.js",
  //   ],
  //   helpers: [],
  // });

  // jasmineInstance.env.clearReporters();
  // jasmineInstance.env.addReporter(specReporter as unknown as jasmine.CustomReporter);
  // jasmine.DEFAULT_TIMEOUT_INTERVAL = 45000;
  // jasmineInstance.execute();
})();
