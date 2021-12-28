import { App, Fn } from "aws-cdk-lib";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacNotificationTestingStack } from "./stacks/yac.notification.testing.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

// eslint-disable-next-line no-new
new YacNotificationTestingStack(app, `${environment}-YacNotificationTesting`, {
  environment,
  snsTopicArns: {
    pushNotificationFailed: Fn.importValue(ExportNames.PushNotificationFailedSnsTopicArn),
  },
});
