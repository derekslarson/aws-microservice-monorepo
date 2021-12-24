/* eslint-disable no-new */
import {
  App,
  Fn,
  aws_ssm as SSM,
  aws_sns as SNS,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacAuthServiceStack } from "./stacks/yac.auth.service.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;
const developer = app.node.tryGetContext("developer") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
} else if (environment === Environment.Local && !developer) {
  throw new Error("'developer' context param required when 'environment' === 'local'.");
}

const stackPrefix = environment === Environment.Local ? developer : environment;

const ExportNames = generateExportNames(stackPrefix);

const stackId = `${stackPrefix}-YacAuthService`;

new YacAuthServiceStack(app, stackId, {
  environment,
  stackPrefix,
  domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(app, `DomainName_${stackId}`, {
    name: Fn.importValue(ExportNames.CustomDomainName),
    regionalDomainName: Fn.importValue(ExportNames.RegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.RegionalHostedZoneId),
  }),
  snsTopics: {
    userCreated: SNS.Topic.fromTopicArn(app, `UserCreatedSnsTopic_${stackId}`, Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn)),
    createUserRequest: SNS.Topic.fromTopicArn(app, `CreateUserRequestSnsTopic_${stackId}`, Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn)),
  },
  googleClient: {
    id: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-id`),
    secret: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-secret`),
  },
  slackClient: {
    id: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-id`),
    secret: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-secret`),
  },
  hostedZone: {
    name: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`),
    id: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`),
    certificateArn: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`),
  },
});
