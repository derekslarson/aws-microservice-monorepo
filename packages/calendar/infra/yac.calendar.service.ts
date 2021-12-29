/* eslint-disable no-new */
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { App, Fn } from "aws-cdk-lib";
import { YacCalendarServiceStack } from "./stacks/yac.calendar.service.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

new YacCalendarServiceStack(app, `${environment}-YacCalendarService`, {
  environment,
  authorizerHandlerFunctionArn: Fn.importValue(ExportNames.AuthorizerHandlerFunctionArn),
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  googleClient: {
    id: Fn.importValue(ExportNames.GoogleClientId),
    secret: Fn.importValue(ExportNames.GoogleClientSecret),
  },
});
