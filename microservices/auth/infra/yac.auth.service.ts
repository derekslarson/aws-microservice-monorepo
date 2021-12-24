// /* eslint-disable no-new */
// import {
//   App,
//   Fn,
//   aws_ssm as SSM,
//   aws_sns as SNS,
// } from "aws-cdk-lib";
// import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
// import { Environment } from "@yac/util/src/enums/environment.enum";
// import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
// import { YacAuthServiceStack } from "./stacks/yac.auth.service.stack";

// const app = new App();

// const environment = app.node.tryGetContext("environment") as string;
// const developer = app.node.tryGetContext("developer") as string;

// if (!environment) {
//   throw new Error("'environment' context param required.");
// } else if (environment === Environment.Local && !developer) {
//   throw new Error("'developer' context param required when 'environment' === 'local'.");
// }

// const stackPrefix = environment === Environment.Local ? developer : environment;

// const ExportNames = generateExportNames(stackPrefix);

// const stackId = `${stackPrefix}-YacAuthService`;

// new YacAuthServiceStack(app, stackId, {
//   environment,
//   stackPrefix,
//   domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(app, `DomainName_${stackId}`, {
//     name: Fn.importValue(ExportNames.CustomDomainName),
//     regionalDomainName: Fn.importValue(ExportNames.RegionalDomainName),
//     regionalHostedZoneId: Fn.importValue(ExportNames.RegionalHostedZoneId),
//   }),
//   snsTopics: {
//     userCreated: SNS.Topic.fromTopicArn(app, `UserCreatedSnsTopic_${stackId}`, Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn)),
//     createUserRequest: SNS.Topic.fromTopicArn(app, `CreateUserRequestSnsTopic_${stackId}`, Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn)),
//   },
// });
