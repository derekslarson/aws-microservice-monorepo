/* eslint-disable no-new */
import { App } from "aws-cdk-lib";
import { YacUtilServiceStack } from "./stacks/yac.util.service.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

new YacUtilServiceStack(app, `${environment}-YacUtilService`, { environment });
