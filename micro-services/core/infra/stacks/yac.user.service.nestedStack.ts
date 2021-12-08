import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { RouteProps } from "@yac/util";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacUserServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const updateUserHandler = new Lambda.Function(this, `UpdateUser${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateUser"),
      handler: "updateUser.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUserHandler = new Lambda.Function(this, `GetUser_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUser"),
      handler: "getUser.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByOrganizationIdHandler = new Lambda.Function(this, `GetUsersByOrganizationId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByOrganizationId"),
      handler: "getUsersByOrganizationId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByTeamIdHandler = new Lambda.Function(this, `GetUsersByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByTeamId"),
      handler: "getUsersByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByGroupIdHandler = new Lambda.Function(this, `GetUsersByGroupId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByGroupId"),
      handler: "getUsersByGroupId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByMeetingIdHandler = new Lambda.Function(this, `GetUsersByMeetingId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByMeetingId"),
      handler: "getUsersByMeetingId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUserImageUploadUrlHandler = new Lambda.Function(this, `GetUserImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUserImageUploadUrl"),
      handler: "getUserImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
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

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}
