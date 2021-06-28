/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import {
  Environment,
  generateExportNames,
  GlobalSecondaryIndex,
  LogLevel,
  RouteProps,
} from "@yac/core";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/core/infra/stacks/yac.http.service.stack";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as SNS from "@aws-cdk/aws-sns";

export class YacEntityServiceStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    const userSignedUpSnsTopicArn = CDK.Fn.importValue(ExportNames.UserSignedUpSnsTopicArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Databases
    const coreTable = new DynamoDB.Table(this, `${id}-CoreTable`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.Two,
      partitionKey: { name: "gsi2pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: DynamoDB.AttributeType.STRING },
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const coreTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ coreTable.tableArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      CORE_TABLE_NAME: coreTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
    };

    // User Handlers
    new Lambda.Function(this, `UserSignedUp_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/userSignedUp"),
      handler: "userSignedUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserSignedUpSnsTopic_${id}`, userSignedUpSnsTopicArn)),
      ],
    });

    const getUsersByTeamIdHandler = new Lambda.Function(this, `GetUsersByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByTeamId"),
      handler: "getUsersByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    // Team Handlers
    const createTeamHandler = new Lambda.Function(this, `CreateTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createTeam"),
      handler: "createTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUserToTeamHandler = new Lambda.Function(this, `AddUserToTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUserToTeam"),
      handler: "addUserToTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromTeamHandler = new Lambda.Function(this, `RemoveUserFromTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromTeam"),
      handler: "removeUserFromTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamsByUserIdHandler = new Lambda.Function(this, `GetTeamsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeamsByUserId"),
      handler: "getTeamsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/teams",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamsByUserIdHandler,
        authorizationScopes: [ "yac/user.read", "yac/team.read" ],
      },
      {
        path: "/teams",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createTeamHandler,
        authorizationScopes: [ "yac/team.write" ],
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUserToTeamHandler,
        authorizationScopes: [ "yac/team.write" ],
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByTeamIdHandler,
        authorizationScopes: [ "yac/team.read", "yac/user.read" ],
      },
      {
        path: "/teams/{teamId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromTeamHandler,
        authorizationScopes: [ "yac/team.write" ],
      },
    ];

    routes.forEach((route) => this.httpApi.addRoute(route));
  }
}
