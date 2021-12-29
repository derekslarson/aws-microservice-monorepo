import { App, Fn } from "aws-cdk-lib";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacTranscodingTestingStack } from "./stacks/yac.transcoding.testing.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

// eslint-disable-next-line no-new
new YacTranscodingTestingStack(app, `${environment}-YacTranscodingTesting`, {
  environment,
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  snsTopicArns: {
    messageTranscoded: Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn),
  },
});
