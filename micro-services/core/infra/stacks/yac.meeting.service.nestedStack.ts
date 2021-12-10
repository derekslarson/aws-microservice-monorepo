import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { RouteProps } from "@yac/util";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacMeetingServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacNestedStackProps) {
    super(scope, id, props);

    const {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    } = props;

    const createMeetingHandler = new Lambda.Function(this, `CreateMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createMeeting"),
      handler: "createMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateMeetingHandler = new Lambda.Function(this, `UpdateMeeting${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateMeeting"),
      handler: "updateMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingHandler = new Lambda.Function(this, `GetMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeeting"),
      handler: "getMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUsersToMeetingHandler = new Lambda.Function(this, `AddUsersToMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersToMeeting"),
      handler: "addUsersToMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromMeetingHandler = new Lambda.Function(this, `RemoveUserFromMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromMeeting"),
      handler: "removeUserFromMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingsByUserIdHandler = new Lambda.Function(this, `GetMeetingsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeetingsByUserId"),
      handler: "getMeetingsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingsByTeamIdHandler = new Lambda.Function(this, `GetMeetingsByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeetingsByTeamId"),
      handler: "getMeetingsByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingsByOrganizationIdHandler = new Lambda.Function(this, `GetMeetingsByOrganizationId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeetingsByOrganizationId"),
      handler: "getMeetingsByOrganizationId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingImageUploadUrlHandler = new Lambda.Function(this, `GetMeetingImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeetingImageUploadUrl"),
      handler: "getMeetingImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/organizations/{organizationId}/meetings",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createMeetingHandler,
        restricted: true,
      },
      {
        path: "/organizations/{organizationId}/meetings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingsByOrganizationIdHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateMeetingHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToMeetingHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromMeetingHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/meetings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/meetings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingsByTeamIdHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingImageUploadUrlHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}
