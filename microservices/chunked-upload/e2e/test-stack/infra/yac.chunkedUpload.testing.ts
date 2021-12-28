import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { App, Fn, } from "aws-cdk-lib";
import { YacChunkedUploadTestingStack } from "./stacks/yac.chunkedUpload.testing.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
}

const ExportNames = generateExportNames(environment);

new YacChunkedUploadTestingStack(app, `${environment}-YacChunkedUploadTesting`, { 
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  vpcAttributes: {
    vpcId: Fn.importValue(ExportNames.ChunkedUploadVpcId),
    availabilityZones: Fn.split(",", Fn.importValue(ExportNames.ChunkedUploadVpcAvailabilityZones)),
    isolatedSubnetIds: Fn.split(",", Fn.importValue(ExportNames.ChunkedUploadVpcIsolatedSubnetIds))
  },
  fileSystemAttributes: {
    id: Fn.importValue(ExportNames.ChunkedUploadFileSystemId),
    accessPointId: Fn.importValue(ExportNames.ChunkedUploadFileSystemAccessPointId),
    securityGroupId: Fn.importValue(ExportNames.ChunkedUploadFileSystemSecurityGroupId)
  }
});
