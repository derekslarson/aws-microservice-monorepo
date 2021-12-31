import {
  Stack,
  NestedStack,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacTeamServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const createTeamHandler = new Function(this, `CreateTeam_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createTeam`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const updateTeamHandler = new Function(this, `UpdateTeam${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateTeam`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getTeamHandler = new Function(this, `GetTeam_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getTeam`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const addUsersToTeamHandler = new Function(this, `AddUsersToTeam_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/addUsersToTeam`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const removeUserFromTeamHandler = new Function(this, `RemoveUserFromTeam_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/removeUserFromTeam`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getTeamsByUserIdHandler = new Function(this, `GetTeamsByUserId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getTeamsByUserId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
    });

    const getTeamsByOrganizationIdHandler = new Function(this, `GetTeamsByOrganizationId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getTeamsByOrganizationId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
    });

    const getTeamImageUploadUrlHandler = new Function(this, `GetTeamImageUploadUrl_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getTeamImageUploadUrl`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
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

    routes.forEach((route) => api.addRoute(route));
  }
}
