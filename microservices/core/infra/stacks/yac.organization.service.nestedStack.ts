import {
  Duration,
  Stack,
  NestedStack,
  aws_lambda as Lambda,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
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

    const createOrganizationHandler = new Lambda.Function(this, `CreateOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/createOrganization`),
      handler: "createOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const updateOrganizationHandler = new Lambda.Function(this, `UpdateOrganization${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/updateOrganization`),
      handler: "updateOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getOrganizationHandler = new Lambda.Function(this, `GetOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getOrganization`),
      handler: "getOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const addUsersToOrganizationHandler = new Lambda.Function(this, `AddUsersToOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/addUsersToOrganization`),
      handler: "addUsersToOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const removeUserFromOrganizationHandler = new Lambda.Function(this, `RemoveUserFromOrganization_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/removeUserFromOrganization`),
      handler: "removeUserFromOrganization.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getOrganizationsByUserIdHandler = new Lambda.Function(this, `GetOrganizationsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getOrganizationsByUserId`),
      handler: "getOrganizationsByUserId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getOrganizationImageUploadUrlHandler = new Lambda.Function(this, `GetOrganizationImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getOrganizationImageUploadUrl`),
      handler: "getOrganizationImageUploadUrl.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
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
