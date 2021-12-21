import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacOrganizationServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const createOrganizationHandler = new Lambda.Function(this, `CreateOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/createOrganization"),
      handler: "createOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateOrganizationHandler = new Lambda.Function(this, `UpdateOrganization${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateOrganization"),
      handler: "updateOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getOrganizationHandler = new Lambda.Function(this, `GetOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/getOrganization"),
      handler: "getOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUsersToOrganizationHandler = new Lambda.Function(this, `AddUsersToOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersToOrganization"),
      handler: "addUsersToOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromOrganizationHandler = new Lambda.Function(this, `RemoveUserFromOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromOrganization"),
      handler: "removeUserFromOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getOrganizationsByUserIdHandler = new Lambda.Function(this, `GetOrganizationsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/getOrganizationsByUserId"),
      handler: "getOrganizationsByUserId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getOrganizationImageUploadUrlHandler = new Lambda.Function(this, `GetOrganizationImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/getOrganizationImageUploadUrl"),
      handler: "getOrganizationImageUploadUrl.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
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

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}
