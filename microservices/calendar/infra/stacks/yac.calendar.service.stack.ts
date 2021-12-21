/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as SSM from "@aws-cdk/aws-ssm";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { Environment, LogLevel, RouteProps } from "@yac/util";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";

export class YacCalendarServiceStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const googleClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-id`);
    const googleClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-secret`);
    const googleClientRedirectUri = `${this.httpApi.apiURL}/google/callback`;

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Databases
    const calendarTable = new DynamoDB.Table(this, `CalendarTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
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
      GOOGLE_CLIENT_ID: googleClientId,
      GOOGLE_CLIENT_SECRET: googleClientSecret,
      GOOGLE_CLIENT_REDIRECT_URI: googleClientRedirectUri,
    };

    const initiateGoogleAccessFlowHandler = new Lambda.Function(this, `InitiateGoogleAccessFlowHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/initiateGoogleAccessFlow"),
      handler: "initiateGoogleAccessFlow.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const completeGoogleAccessFlowHandler = new Lambda.Function(this, `CompleteGoogleAccessFlowHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/completeGoogleAccessFlow"),
      handler: "completeGoogleAccessFlow.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGoogleEventsHandler = new Lambda.Function(this, `GetGoogleEventsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGoogleEvents"),
      handler: "getGoogleEvents.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGoogleAccountsHandler = new Lambda.Function(this, `GetGoogleAccountsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGoogleAccounts"),
      handler: "getGoogleAccounts.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGoogleSettingsHandler = new Lambda.Function(this, `GetGoogleSettingsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGoogleSettings"),
      handler: "getGoogleSettings.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateGoogleSettingsHandler = new Lambda.Function(this, `UpdateGoogleSettingsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateGoogleSettings"),
      handler: "updateGoogleSettings.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, calendarTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
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

    routes.forEach((route) => this.httpApi.addRoute(route));

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `CalendarTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/calendar-table-name`,
      stringValue: calendarTable.tableName,
    });
  }
}
