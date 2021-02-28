import * as CDK from "@aws-cdk/core";
import { YacBServiceStack } from "./stacks/yac.b.service.stack";
import { Environment } from "../../core-service/src/enums/environment.enum";

const app = new CDK.App();

const environment = app.node.tryGetContext("environment") as string;
const developer = app.node.tryGetContext("developer") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
} else if (environment === Environment.Local && !developer) {
  throw new Error("'developer' context param required when 'environment' === 'local'.");
}

const stackPrefix = environment === Environment.Local ? `${environment}-${developer}` : environment;

// eslint-disable-next-line no-new
new YacBServiceStack(app, `${stackPrefix}-yac-b-service`, { });
