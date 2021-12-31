import {
  Stack,
  NestedStack,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
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

    const createGroupHandler = new Function(this, `CreateGroup_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createGroup`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const updateGroupHandler = new Function(this, `UpdateGroup_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateGroup`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getGroupHandler = new Function(this, `GetGroup_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGroup`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const addUsersToGroupHandler = new Function(this, `AddUsersToGroup_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/addUsersToGroup`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const removeUserFromGroupHandler = new Function(this, `RemoveUserFromGroup_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/removeUserFromGroup`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getGroupsByUserIdHandler = new Function(this, `GetGroupsByUserId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGroupsByUserId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
    });

    const getGroupsByTeamIdHandler = new Function(this, `GetGroupsByTeamId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGroupsByTeamId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getGroupsByOrganizationIdHandler = new Function(this, `GetGroupsByOrganizationId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGroupsByOrganizationId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getGroupImageUploadUrlHandler = new Function(this, `GetGroupImageUploadUrl_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getGroupImageUploadUrl`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
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
