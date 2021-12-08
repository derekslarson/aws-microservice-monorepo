import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { RouteProps } from "@yac/util";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacGroupServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const createGroupHandler = new Lambda.Function(this, `CreateGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createGroup"),
      handler: "createGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateGroupHandler = new Lambda.Function(this, `UpdateGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateGroup"),
      handler: "updateGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupHandler = new Lambda.Function(this, `GetGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroup"),
      handler: "getGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUsersToGroupHandler = new Lambda.Function(this, `AddUsersToGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersToGroup"),
      handler: "addUsersToGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromGroupHandler = new Lambda.Function(this, `RemoveUserFromGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromGroup"),
      handler: "removeUserFromGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupsByUserIdHandler = new Lambda.Function(this, `GetGroupsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroupsByUserId"),
      handler: "getGroupsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupsByTeamIdHandler = new Lambda.Function(this, `GetGroupsByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroupsByTeamId"),
      handler: "getGroupsByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupImageUploadUrlHandler = new Lambda.Function(this, `GetGroupImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroupImageUploadUrl"),
      handler: "getGroupImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/groups",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createGroupHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateGroupHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupsByTeamIdHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToGroupHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromGroupHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupImageUploadUrlHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}
