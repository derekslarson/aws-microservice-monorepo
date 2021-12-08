import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as IAM from "@aws-cdk/aws-iam";
import { RouteProps } from "@yac/util";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacMessageServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacMessageServiceNestedStackProps) {
    super(scope, id, props);

    const {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      rawMessageS3BucketFullAccessPolicyStatement,
      enhancedMessageS3BucketFullAccessPolicyStatement,
      getMessageUploadTokenSecretPolicyStatement,
      openSearchFullAccessPolicyStatement,
    } = props;

    const createFriendMessageHandler = new Lambda.Function(this, `CreateFriendMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createFriendMessage"),
      handler: "createFriendMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const createGroupMessageHandler = new Lambda.Function(this, `CreateGroupMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createGroupMessage"),
      handler: "createGroupMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const createMeetingMessageHandler = new Lambda.Function(this, `CreateMeetingMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createMeetingMessage"),
      handler: "createMeetingMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, rawMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessageHandler = new Lambda.Function(this, `GetMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessage"),
      handler: "getMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateMessageByUserIdHandler = new Lambda.Function(this, `UpdateMessageByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateMessageByUserId"),
      handler: "updateMessageByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateMessageHandler = new Lambda.Function(this, `UpdateMessage${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateMessage"),
      handler: "updateMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessagesByUserAndFriendIdsHandler = new Lambda.Function(this, `GetMessagesByUserAndFriendIds_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessagesByUserAndFriendIds"),
      handler: "getMessagesByUserAndFriendIds.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessagesByGroupIdHandler = new Lambda.Function(this, `GetMessagesByGroupId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessagesByGroupId"),
      handler: "getMessagesByGroupId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessagesByMeetingIdHandler = new Lambda.Function(this, `GetMessagesByMeetingId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessagesByMeetingId"),
      handler: "getMessagesByMeetingId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessagesByUserIdAndSearchTermHandler = new Lambda.Function(this, `GetMessagesByUserIdAndSearchTerm_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessagesByUserIdAndSearchTerm"),
      handler: "getMessagesByUserIdAndSearchTerm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateFriendMessagesByUserIdHandler = new Lambda.Function(this, `UpdateFriendMessagesByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateFriendMessagesByUserId"),
      handler: "updateFriendMessagesByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateGroupMessagesByUserIdHandler = new Lambda.Function(this, `UpdateGroupMessagesByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateGroupMessagesByUserId"),
      handler: "updateGroupMessagesByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const updateMeetingMessagesByUserIdHandler = new Lambda.Function(this, `UpdateMeetingMessagesByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/updateMeetingMessagesByUserId"),
      handler: "updateMeetingMessagesByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/friends/{friendId}/messages",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createFriendMessageHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/friends/{friendId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByUserAndFriendIdsHandler,
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
      {
        path: "/users/{userId}/friends/{friendId}/messages",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateFriendMessagesByUserIdHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/groups/{groupId}/messages",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateGroupMessagesByUserIdHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/meetings/{meetingId}/messages",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateMeetingMessagesByUserIdHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}

export interface YacMessageServiceNestedStackProps extends YacNestedStackProps {
  rawMessageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
  enhancedMessageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
  getMessageUploadTokenSecretPolicyStatement: IAM.PolicyStatement;
  openSearchFullAccessPolicyStatement: IAM.PolicyStatement;
}
