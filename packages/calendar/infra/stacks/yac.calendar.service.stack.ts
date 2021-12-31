/* eslint-disable no-new */
import {
  RemovalPolicy,
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
import { Function } from "@yac/util/infra/constructs/lambda.function";

export class YacCalendarServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacCalendarServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, domainNameAttributes, authorizerHandlerFunctionArn, googleClient } = props;

    // Databases
    const calendarTable = new DynamoDB.Table(this, `CalendarTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const httpApi = new HttpApi(this, `Api_${id}`, {
      serviceName: "calendar",
      domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes),
      authorizerHandler: Lambda.Function.fromFunctionArn(this, `AuthorizerHandler_${id}`, authorizerHandlerFunctionArn),
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

    const initiateGoogleAccessFlowHandler = new Function(this, `InitiateGoogleAccessFlowHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/initiateGoogleAccessFlow`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
    });

    const completeGoogleAccessFlowHandler = new Function(this, `CompleteGoogleAccessFlowHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/completeGoogleAccessFlow`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
    });

    const getGoogleEventsHandler = new Function(this, `GetGoogleEventsHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGoogleEvents`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
    });

    const getGoogleAccountsHandler = new Function(this, `GetGoogleAccountsHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGoogleAccounts`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
    });

    const getGoogleSettingsHandler = new Function(this, `GetGoogleSettingsHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGoogleSettings`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
    });

    const updateGoogleSettingsHandler = new Function(this, `UpdateGoogleSettingsHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateGoogleSettings`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
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
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  authorizerHandlerFunctionArn: string;
  googleClient: {
    id: string;
    secret: string;
  };
}
