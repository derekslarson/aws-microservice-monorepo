import * as CDK from "@aws-cdk/core";
import { Environment } from "@yac/util";
import { YacMessageTesting } from "./stacks/yac.message.testing.stack";

const app = new CDK.App();

const environment = app.node.tryGetContext("environment") as string;
const developer = app.node.tryGetContext("developer") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
} else if (environment === Environment.Local && !developer) {
  throw new Error("'developer' context param required when 'environment' === 'local'.");
}

const stackPrefix = environment === Environment.Local ? developer : environment;

// eslint-disable-next-line no-new
new YacMessageTesting(app, `${stackPrefix}-YacMessageTesting`, { serviceName: "message-testing", env:{
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT
} });
