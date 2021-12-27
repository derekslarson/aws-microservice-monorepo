/* eslint-disable no-new */
import { App } from "aws-cdk-lib";
import { YacUtilServiceStack } from "./stacks/yac.util.service.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
}

new YacUtilServiceStack(app, `${environment}-YacUtilService`, { environment });
