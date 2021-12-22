import { App } from "aws-cdk-lib";
import { YacUtilServiceStack } from "./stacks/yac.util.service.stack";
import { Environment } from "../src/enums/environment.enum";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;
const developer = app.node.tryGetContext("developer") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
} else if (environment === Environment.Local && !developer) {
  throw new Error("'developer' context param required when 'environment' === 'local'.");
}

const stackPrefix = environment === Environment.Local ? developer : environment;

// eslint-disable-next-line no-new
new YacUtilServiceStack(app, `${stackPrefix}-YacUtilService`, { });
