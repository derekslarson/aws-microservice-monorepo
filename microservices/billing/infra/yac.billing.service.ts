import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { App, Fn } from "aws-cdk-lib";
import { YacBillingServiceStack } from "./stacks/yac.billing.service.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

// eslint-disable-next-line no-new
new YacBillingServiceStack(app, `${environment}-YacBillingService`, {
  environment,
  authorizerHandlerFunctionArn: Fn.importValue(ExportNames.AuthorizerHandlerFunctionArn),
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  snsTopicArns: {
    userCreated: Fn.importValue(ExportNames.UserCreatedSnsTopicArn),
    organizationCreated: Fn.importValue(ExportNames.OrganizationCreatedSnsTopicArn),
    userAddedToOrganization: Fn.importValue(ExportNames.UserAddedToOrganizationSnsTopicArn),
    userRemovedFromOrganization: Fn.importValue(ExportNames.UserRemovedFromOrganizationSnsTopicArn),
    billingPlanUpdated: Fn.importValue(ExportNames.BillingPlanUpdatedSnsTopicArn),
  },
  stripe: {
    apiKey: Fn.importValue(ExportNames.StripeApiKey),
    freePlanProductId: Fn.importValue(ExportNames.StripeFreePlanProductId),
    paidPlanProductId: Fn.importValue(ExportNames.StripePaidPlanProductId),
    webhookSecret: Fn.importValue(ExportNames.StripeWebhookSecret),
  },
});
