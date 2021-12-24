/* eslint-disable no-new */
import { App } from "aws-cdk-lib";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacPipelineStack } from "./stacks/yac.pipeline.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;
const developer = app.node.tryGetContext("developer") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
} else if (environment === Environment.Local && !developer) {
  throw new Error("'developer' context param required when 'environment' === 'local'.");
}

const stackPrefix = environment === Environment.Local ? developer : environment;

new YacPipelineStack(app, `${stackPrefix}-YacPipeline`, { environment, stackPrefix });
