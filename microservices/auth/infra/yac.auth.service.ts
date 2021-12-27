/* eslint-disable no-new */
import {
  App,
  Fn,
} from "aws-cdk-lib";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacAuthServiceStack } from "./stacks/yac.auth.service.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
}

const ExportNames = generateExportNames(environment);

const stackName = `${environment}-YacAuthService`;

new YacAuthServiceStack(app, "YacAuthService", {
  stackName,
  environment,
  certificateArn: Fn.importValue(ExportNames.CertificateArn),
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  hostedZoneAttributes: {
    id: Fn.importValue(ExportNames.HostedZoneId),
    name: Fn.importValue(ExportNames.HostedZoneName),
  },
  googleClient: {
    id: Fn.importValue(ExportNames.GoogleClientId),
    secret: Fn.importValue(ExportNames.GoogleClientSecret),
  },
  slackClient: {
    id: Fn.importValue(ExportNames.SlackClientId),
    secret: Fn.importValue(ExportNames.SlackClientSecret),
  },
  snsTopicArns: {
    createUserRequest: Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn),
    userCreated: Fn.importValue(ExportNames.UserCreatedSnsTopicArn),
  },
});
