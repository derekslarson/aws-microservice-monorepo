import {
  Stack,
  NestedStack,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacUserServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const updateUserHandler = new Function(this, `UpdateUser${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateUser`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getUserHandler = new Function(this, `GetUser_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getUser`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getUsersByOrganizationIdHandler = new Function(this, `GetUsersByOrganizationId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getUsersByOrganizationId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getUsersByTeamIdHandler = new Function(this, `GetUsersByTeamId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getUsersByTeamId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getUsersByGroupIdHandler = new Function(this, `GetUsersByGroupId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getUsersByGroupId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getUsersByMeetingIdHandler = new Function(this, `GetUsersByMeetingId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getUsersByMeetingId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getUserImageUploadUrlHandler = new Function(this, `GetUserImageUploadUrl_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getUserImageUploadUrl`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateUserHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUserHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByOrganizationIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByTeamIdHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByGroupIdHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByMeetingIdHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUserImageUploadUrlHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => api.addRoute(route));
  }
}
