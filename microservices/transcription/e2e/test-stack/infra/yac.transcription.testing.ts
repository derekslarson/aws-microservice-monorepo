import { App, Fn } from "aws-cdk-lib";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacTranscriptionTestingStack } from "./stacks/yac.transcription.testing.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
}

const ExportNames = generateExportNames(environment);

// eslint-disable-next-line no-new
new YacTranscriptionTestingStack(app, `${environment}-YacTranscriptionTesting`, {
  environment,
  snsTopicArns: {
    messageTranscribed: Fn.importValue(ExportNames.MessageTranscribedSnsTopicArn),
  },
});
