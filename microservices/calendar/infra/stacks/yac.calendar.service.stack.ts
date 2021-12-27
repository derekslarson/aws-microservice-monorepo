/* eslint-disable no-new */
import {
  RemovalPolicy,
  Duration,
  Stack,
  aws_ssm as SSM,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_lambda as Lambda,
  StackProps,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { HttpApi, RouteProps } from "@yac/util/infra/constructs/http.api";
import { OAuth2ClientData } from "@yac/util/infra/stacks/yac.util.service.stack";

export class YacCalendarServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacCalendarServiceStackProps) {
    super(scope, id, props);

    const { environment, domainName, authorizerHandler, googleClient } = props;

    // Databases
    const calendarTable = new DynamoDB.Table(this, `CalendarTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const httpApi = new HttpApi(this, `Api_${id}`, {
      serviceName: "calendar",
      domainName,
      authorizerHandler,
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const calendarTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ calendarTable.tableArn, `${calendarTable.tableArn}/*` ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      CALENDAR_TABLE_NAME: calendarTable.tableName,
      GOOGLE_CLIENT_ID: googleClient.id,
      GOOGLE_CLIENT_SECRET: googleClient.secret,
      GOOGLE_CLIENT_REDIRECT_URI: `${httpApi.apiUrl}/google/callback`,
    };

    const initiateGoogleAccessFlowHandler = new Lambda.Function(this, `InitiateGoogleAccessFlowHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/initiateGoogleAccessFlow`),
      handler: "initiateGoogleAccessFlow.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const completeGoogleAccessFlowHandler = new Lambda.Function(this, `CompleteGoogleAccessFlowHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/completeGoogleAccessFlow`),
      handler: "completeGoogleAccessFlow.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGoogleEventsHandler = new Lambda.Function(this, `GetGoogleEventsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGoogleEvents`),
      handler: "getGoogleEvents.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGoogleAccountsHandler = new Lambda.Function(this, `GetGoogleAccountsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGoogleAccounts`),
      handler: "getGoogleAccounts.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGoogleSettingsHandler = new Lambda.Function(this, `GetGoogleSettingsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGoogleSettings`),
      handler: "getGoogleSettings.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const updateGoogleSettingsHandler = new Lambda.Function(this, `UpdateGoogleSettingsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/updateGoogleSettings`),
      handler: "updateGoogleSettings.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/google/access",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: initiateGoogleAccessFlowHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/google/events",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGoogleEventsHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/google/accounts",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGoogleAccountsHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/google/settings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGoogleSettingsHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/google/settings",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateGoogleSettingsHandler,
        restricted: true,
      },
      {
        path: "/google/callback",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: completeGoogleAccessFlowHandler,
      },
    ];

    routes.forEach((route) => httpApi.addRoute(route));

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `CalendarTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/calendar-table-name`,
      stringValue: calendarTable.tableName,
    });
  }
}

export interface YacCalendarServiceStackProps extends StackProps {
  environment: string;
  domainName: ApiGatewayV2.IDomainName;
  googleClient: OAuth2ClientData;
  authorizerHandler: Lambda.IFunction;
}
