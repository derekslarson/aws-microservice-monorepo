/* eslint-disable no-new */
import {
  App,
  Fn,
} from "aws-cdk-lib";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacAuthServiceStack } from "./stacks/yac.auth.service.stack";

const environment = process.env.BUILD_ENV;

const app = new App();

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

new YacAuthServiceStack(app, `${environment}-YacAuthService`, {
  environment,
  certificateArn: Fn.importValue(ExportNames.CertificateArn),
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  hostedZoneAttributes: {
    hostedZoneId: Fn.importValue(ExportNames.HostedZoneId),
    zoneName: Fn.importValue(ExportNames.HostedZoneName),
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
