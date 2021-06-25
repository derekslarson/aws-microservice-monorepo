/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import {
  Environment,
  generateExportNames,
  LogLevel,
  RouteProps,
  GlobalSecondaryIndex,
} from "@yac/core";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/core/infra/stacks/yac.http.service.stack";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as SNS from "@aws-cdk/aws-sns";

export class YacUserServiceStack extends YacHttpServiceStack {
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
    const coreTableName = CDK.Fn.importValue(ExportNames.CoreTableName);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Database
    const coreTable = DynamoDB.Table.fromTableAttributes(this, "CoreTable", {
      tableName: coreTableName,
      globalIndexes: [ GlobalSecondaryIndex.One ],
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      USER_SIGNED_UP_SNS_TOPIC_ARN: userSignedUpSnsTopicArn,
      CORE_TABLE_NAME: coreTableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
    };

    // Handlers
    const userSignedUpHandler = new Lambda.Function(this, `UserSignedUp_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/userSignedUp"),
      handler: "userSignedUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserSignedUpSnsTopic_${id}`, userSignedUpSnsTopicArn)),
      ],
    });

    const getTeamsByUserIdHandler = new Lambda.Function(this, `GetTeamsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeamsByUserId"),
      handler: "getTeamsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/teams",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamsByUserIdHandler,
        authorizationScopes: [ "yac/user.read", "yac/team.read" ],
      },
    ];

    routes.forEach((route) => this.httpApi.addRoute(route));

    // permissions for the handler
    coreTable.grantFullAccess(userSignedUpHandler);
    coreTable.grantReadData(getTeamsByUserIdHandler);
  }
}
