/* eslint-disable no-nested-ternary */
/* eslint-disable no-new */
import { App } from "aws-cdk-lib";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacPipelineStack } from "./stacks/yac.pipeline.stack";

const app = new App();

const { BUILD_ENV: environment, BRANCH: branchEnvVar } = process.env;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

if (environment !== Environment.Dev && environment !== Environment.Prod && !branchEnvVar) {
  throw new Error("'BRANCH' environment variable required when BUILD_ENV isn't 'dev' or 'prod'");
}

const branch = environment === Environment.Dev ? "develop" : environment === Environment.Prod ? "master" : branchEnvVar as string;

new YacPipelineStack(app, `${environment}-YacPipeline`, { environment, branch });
