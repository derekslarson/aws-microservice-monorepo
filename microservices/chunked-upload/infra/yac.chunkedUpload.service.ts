/* eslint-disable no-new */
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { App, Fn } from "aws-cdk-lib";

import { YacChunkedUploadServiceStack } from "./stacks/yac.chunkedUpload.service.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
}

const ExportNames = generateExportNames(environment);

new YacChunkedUploadServiceStack(app, `${environment}-YacChunkedUploadService`, {
  environment,
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  secretArns: { messageUploadToken: Fn.importValue(ExportNames.MessageUploadTokenSecretArn) },
  s3BucketArns: { rawMessage: Fn.importValue(ExportNames.RawMessageS3BucketArn) },
});
