/* eslint-disable no-new */
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { App, Fn } from "aws-cdk-lib";
import { YacTranscodingServiceStack } from "./stacks/yac.transcoding.service.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

new YacTranscodingServiceStack(app, `${environment}-YacTranscodingService`, {
  environment,
  audoAi: { apiKey: Fn.importValue(ExportNames.AudoAiApiKey) },
  s3BucketArns: {
    rawMessage: Fn.importValue(ExportNames.RawMessageS3BucketArn),
    enhancedMessage: Fn.importValue(ExportNames.EnhancedMessageS3BucketArn),
  },
  snsTopicArns: { messageTranscoded: Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn) },
});
