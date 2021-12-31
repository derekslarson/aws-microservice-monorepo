import {
  Stack,
  NestedStack,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacOrganizationServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const createOrganizationHandler = new Function(this, `CreateOrganization_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createOrganization`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const updateOrganizationHandler = new Function(this, `UpdateOrganization${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateOrganization`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getOrganizationHandler = new Function(this, `GetOrganization_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getOrganization`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const addUsersToOrganizationHandler = new Function(this, `AddUsersToOrganization_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/addUsersToOrganization`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const removeUserFromOrganizationHandler = new Function(this, `RemoveUserFromOrganization_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/removeUserFromOrganization`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getOrganizationsByUserIdHandler = new Function(this, `GetOrganizationsByUserId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getOrganizationsByUserId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
    });

    const getOrganizationImageUploadUrlHandler = new Function(this, `GetOrganizationImageUploadUrl_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getOrganizationImageUploadUrl`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/organizations",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createOrganizationHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateOrganizationHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getOrganizationHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/organizations",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getOrganizationsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToOrganizationHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromOrganizationHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getOrganizationImageUploadUrlHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => api.addRoute(route));
  }
}
