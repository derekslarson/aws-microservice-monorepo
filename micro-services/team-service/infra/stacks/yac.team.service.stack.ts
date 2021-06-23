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
} from "@yac/core";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/core/infra/stacks/yac.http.service.stack";

export class YacTeamServiceStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    const coreTableName = CDK.Fn.importValue(ExportNames.CoreTableName);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Databases
    const coreTable = DynamoDB.Table.fromTableName(this, "CoreTable", coreTableName);

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      CORE_TABLE_NAME: coreTableName,
    };

    // Handlers
    const createTeamHandler = new Lambda.Function(this, `CreateTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createTeam"),
      handler: "createTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUserToTeamHandler = new Lambda.Function(this, `AddUserToTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUserToTeam"),
      handler: "addUserToTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromTeamHandler = new Lambda.Function(this, `RemoveUserFromTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromTeam"),
      handler: "removeUserFromTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByTeamIdHandler = new Lambda.Function(this, `GetUsersByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByTeamId"),
      handler: "getUsersByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    coreTable.grantFullAccess(createTeamHandler);
    coreTable.grantFullAccess(addUserToTeamHandler);
    coreTable.grantFullAccess(removeUserFromTeamHandler);
    coreTable.grantFullAccess(getUsersByTeamIdHandler);

    const routes: RouteProps[] = [
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
        authorizationScopes: [ "yac/team.read" ],
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
