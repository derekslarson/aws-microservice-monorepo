/* eslint-disable no-new */
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { App, Fn } from "aws-cdk-lib";
import { YacTranscriptionServiceStack } from "./stacks/yac.transcription.service.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

new YacTranscriptionServiceStack(app, `${environment}-YacTranscriptionService`, {
  environment,
  s3BucketArns: {
    rawMessage: Fn.importValue(ExportNames.RawMessageS3BucketArn),
    enhancedMessage: Fn.importValue(ExportNames.EnhancedMessageS3BucketArn),
  },
  snsTopicArns: {
    messageTranscoded: Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn),
    messageTranscribed: Fn.importValue(ExportNames.MessageTranscribedSnsTopicArn),
  },
});
