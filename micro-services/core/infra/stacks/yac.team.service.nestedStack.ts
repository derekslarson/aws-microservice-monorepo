import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacTeamServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const createTeamHandler = new Lambda.Function(this, `CreateTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createTeam"),
      handler: "createTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateTeamHandler = new Lambda.Function(this, `UpdateTeam${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateTeam"),
      handler: "updateTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamHandler = new Lambda.Function(this, `GetTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeam"),
      handler: "getTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUsersToTeamHandler = new Lambda.Function(this, `AddUsersToTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersToTeam"),
      handler: "addUsersToTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromTeamHandler = new Lambda.Function(this, `RemoveUserFromTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromTeam"),
      handler: "removeUserFromTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamsByUserIdHandler = new Lambda.Function(this, `GetTeamsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeamsByUserId"),
      handler: "getTeamsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamsByOrganizationIdHandler = new Lambda.Function(this, `GetTeamsByOrganizationId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeamsByOrganizationId"),
      handler: "getTeamsByOrganizationId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamImageUploadUrlHandler = new Lambda.Function(this, `GetTeamImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeamImageUploadUrl"),
      handler: "getTeamImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/organizations/{organizationId}/teams",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createTeamHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}/teams",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamsByOrganizationIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateTeamHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/teams",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToTeamHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromTeamHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamImageUploadUrlHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}
