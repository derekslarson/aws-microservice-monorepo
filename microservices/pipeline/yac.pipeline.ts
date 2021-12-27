/* eslint-disable no-nested-ternary */
/* eslint-disable no-new */
import { App } from "aws-cdk-lib";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacPipelineStack } from "./stacks/yac.pipeline.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as Environment;
const branchParam = app.node.tryGetContext("branch") as Environment;

if (!environment) {
  throw new Error("'environment' context param required.");
}

if (environment !== Environment.Dev && environment !== Environment.Prod && !branchParam) {
  throw new Error("'branch' context param required when environment isn't 'dev' or 'prod'");
}

const branch = environment === Environment.Dev ? "develop" : environment === Environment.Prod ? "master" : branchParam;

new YacPipelineStack(app, `${environment}-YacPipeline`, { environment, branch });
