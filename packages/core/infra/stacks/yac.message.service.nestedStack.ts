import {
  Stack,
  NestedStack,
  aws_iam as IAM,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacMessageServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacMessageServiceNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      rawMessageS3BucketFullAccessPolicyStatement,
      enhancedMessageS3BucketFullAccessPolicyStatement,
      getMessageUploadTokenSecretPolicyStatement,
      openSearchFullAccessPolicyStatement,
    } = props;

    const createOneOnOneMessageHandler = new Function(this, `CreateOneOnOneMessage_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createOneOnOneMessage`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
    });

    const createGroupMessageHandler = new Function(this, `CreateGroupMessage_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createGroupMessage`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
    });

    const createMeetingMessageHandler = new Function(this, `CreateMeetingMessage_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createMeetingMessage`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
    });

    const getMessageHandler = new Function(this, `GetMessage_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMessage`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const updateMessageByUserIdHandler = new Function(this, `UpdateMessageByUserId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateMessageByUserId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const updateMessageHandler = new Function(this, `UpdateMessage${id}`, {
      codePath: `${__dirname}/../../dist/handlers/updateMessage`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getMessagesByOneOnOneIdHandler = new Function(this, `GetMessagesByOneOnOneId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMessagesByOneOnOneId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getMessagesByGroupIdHandler = new Function(this, `GetMessagesByGroupId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMessagesByGroupId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getMessagesByMeetingIdHandler = new Function(this, `GetMessagesByMeetingId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMessagesByMeetingId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getMessagesByUserIdAndSearchTermHandler = new Function(this, `GetMessagesByUserIdAndSearchTerm_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getMessagesByUserIdAndSearchTerm`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
    });

    const routes: RouteProps[] = [
      {
        path: "/one-on-ones/{oneOnOneId}/messages",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createOneOnOneMessageHandler,
        restricted: true,
      },
      {
        path: "/one-on-ones/{oneOnOneId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByOneOnOneIdHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/messages",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createGroupMessageHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByGroupIdHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/messages",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createMeetingMessageHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByMeetingIdHandler,
        restricted: true,
      },

      {
        path: "/messages/{messageId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessageHandler,
        restricted: true,
      },
      {
        path: "/messages/{messageId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateMessageHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByUserIdAndSearchTermHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/messages/{messageId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateMessageByUserIdHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => api.addRoute(route));
  }
}

export interface YacMessageServiceNestedStackProps extends YacNestedStackProps {
  rawMessageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
  enhancedMessageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
  getMessageUploadTokenSecretPolicyStatement: IAM.PolicyStatement;
  openSearchFullAccessPolicyStatement: IAM.PolicyStatement;
}
