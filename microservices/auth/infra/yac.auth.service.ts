/* eslint-disable no-new */
import {
  App,
  Fn,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_certificatemanager as ACM,
  aws_route53 as Route53,
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
}

const stackPrefix = environment === Environment.Local ? developer : environment;

const ExportNames = generateExportNames(stackPrefix);

const stackName = `${stackPrefix}-YacAuthService`;

const isLocal = !Object.values(Environment).includes(environment as Environment);

new YacAuthServiceStack(app, stackName, {
  stackName,
  environment,
  certificate: ACM.Certificate.fromCertificateArn(app, `AcmCertificate_${stackName}`, SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/certificate-arn`)),
  hostedZone: Route53.HostedZone.fromHostedZoneAttributes(app, `HostedZone_${stackName}`, {
    zoneName: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/hosted-zone-name`),
    hostedZoneId: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/hosted-zone-id`),
  }),
  domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(app, `DomainName_${stackName}`, {
    name: Fn.importValue(ExportNames.CustomDomainName),
    regionalDomainName: Fn.importValue(ExportNames.RegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.RegionalHostedZoneId),
  }),
  snsTopics: {
    userCreated: SNS.Topic.fromTopicArn(app, `UserCreatedSnsTopic_${stackName}`, Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn)),
    createUserRequest: SNS.Topic.fromTopicArn(app, `CreateUserRequestSnsTopic_${stackName}`, Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn)),
  },
  googleClient: {
    id: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/google-client-id`),
    secret: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/google-client-secret`),
  },
  slackClient: {
    id: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/slack-client-id`),
    secret: SSM.StringParameter.valueForStringParameter(app, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/slack-client-secret`),
  },
});
