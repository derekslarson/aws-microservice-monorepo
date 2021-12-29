import {
  Duration,
  Stack,
  NestedStack,
  aws_lambda as Lambda,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacGroupServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const createGroupHandler = new Lambda.Function(this, `CreateGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/createGroup`),
      handler: "createGroup.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const updateGroupHandler = new Lambda.Function(this, `UpdateGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/updateGroup`),
      handler: "updateGroup.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGroupHandler = new Lambda.Function(this, `GetGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGroup`),
      handler: "getGroup.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const addUsersToGroupHandler = new Lambda.Function(this, `AddUsersToGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/addUsersToGroup`),
      handler: "addUsersToGroup.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const removeUserFromGroupHandler = new Lambda.Function(this, `RemoveUserFromGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/removeUserFromGroup`),
      handler: "removeUserFromGroup.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGroupsByUserIdHandler = new Lambda.Function(this, `GetGroupsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGroupsByUserId`),
      handler: "getGroupsByUserId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGroupsByTeamIdHandler = new Lambda.Function(this, `GetGroupsByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGroupsByTeamId`),
      handler: "getGroupsByTeamId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGroupsByOrganizationIdHandler = new Lambda.Function(this, `GetGroupsByOrganizationId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGroupsByOrganizationId`),
      handler: "getGroupsByOrganizationId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getGroupImageUploadUrlHandler = new Lambda.Function(this, `GetGroupImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getGroupImageUploadUrl`),
      handler: "getGroupImageUploadUrl.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/organizations/{organizationId}/groups",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createGroupHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}/groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupsByOrganizationIdHandler,
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

    routes.forEach((route) => api.addRoute(route));
  }
}
