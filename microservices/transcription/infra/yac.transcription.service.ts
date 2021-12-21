import * as CDK from "@aws-cdk/core";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacTranscriptionServiceStack } from "./stacks/yac.transcription.service.stack";

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
new YacTranscriptionServiceStack(app, `${stackPrefix}-YacTranscriptionService`);
