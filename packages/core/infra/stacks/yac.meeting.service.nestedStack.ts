import {
  Stack,
  NestedStack,
  aws_iam as IAM,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacMeetingServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacMeetingServiceNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    } = props;

    const createMeetingHandler = new Function(this, `CreateMeeting_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createMeeting`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const updateMeetingHandler = new Function(this, `UpdateMeeting${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateMeeting`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getMeetingHandler = new Function(this, `GetMeeting_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMeeting`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
    });

    const addUsersToMeetingHandler = new Function(this, `AddUsersToMeeting_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/addUsersToMeeting`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const removeUserFromMeetingHandler = new Function(this, `RemoveUserFromMeeting_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/removeUserFromMeeting`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getMeetingsByUserIdHandler = new Function(this, `GetMeetingsByUserId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMeetingsByUserId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
    });

    const getMeetingsByTeamIdHandler = new Function(this, `GetMeetingsByTeamId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMeetingsByTeamId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
    });

    const getMeetingsByOrganizationIdHandler = new Function(this, `GetMeetingsByOrganizationId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMeetingsByOrganizationId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
    });

    const getMeetingImageUploadUrlHandler = new Function(this, `GetMeetingImageUploadUrl_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMeetingImageUploadUrl`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
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

    routes.forEach((route) => api.addRoute(route));
  }
}

export interface YacMeetingServiceNestedStackProps extends YacNestedStackProps {
  openSearchFullAccessPolicyStatement: IAM.PolicyStatement;
}
