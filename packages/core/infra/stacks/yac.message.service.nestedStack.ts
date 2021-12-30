import {
  Duration,
  Stack,
  NestedStack,
  aws_lambda as Lambda,
  aws_iam as IAM,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
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

    const createOneOnOneMessageHandler = new Lambda.Function(this, `CreateOneOnOneMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/createOneOnOneMessage`),
      handler: "createOneOnOneMessage.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const createGroupMessageHandler = new Lambda.Function(this, `CreateGroupMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/createGroupMessage`),
      handler: "createGroupMessage.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const createMeetingMessageHandler = new Lambda.Function(this, `CreateMeetingMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/createMeetingMessage`),
      handler: "createMeetingMessage.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getMessageHandler = new Lambda.Function(this, `GetMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getMessage`),
      handler: "getMessage.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const updateMessageByUserIdHandler = new Lambda.Function(this, `UpdateMessageByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/updateMessageByUserId`),
      handler: "updateMessageByUserId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const updateMessageHandler = new Lambda.Function(this, `UpdateMessage${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/updateMessage`),
      handler: "updateMessage.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getMessagesByOneOnOneIdHandler = new Lambda.Function(this, `GetMessagesByOneOnOneId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getMessagesByOneOnOneId`),
      handler: "getMessagesByOneOnOneId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getMessagesByGroupIdHandler = new Lambda.Function(this, `GetMessagesByGroupId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getMessagesByGroupId`),
      handler: "getMessagesByGroupId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getMessagesByMeetingIdHandler = new Lambda.Function(this, `GetMessagesByMeetingId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getMessagesByMeetingId`),
      handler: "getMessagesByMeetingId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getMessagesByUserIdAndSearchTermHandler = new Lambda.Function(this, `GetMessagesByUserIdAndSearchTerm_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getMessagesByUserIdAndSearchTerm`),
      handler: "getMessagesByUserIdAndSearchTerm.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
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
