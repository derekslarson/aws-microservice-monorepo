/* eslint-disable max-len */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-console */
/* eslint-disable no-new */
import {
  RemovalPolicy,
  CfnOutput,
  custom_resources as CustomResources,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_sns as SNS,
  aws_sns_subscriptions as SnsSubscriptions,
  aws_ssm as SSM,
  aws_sqs as SQS,
  aws_route53 as Route53,
  StackProps,
  Stack,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { HttpApi, RouteProps } from "@yac/util/infra/constructs/http.api";
import { WebSocketApi } from "@yac/util/infra/constructs/webSocket.api";
import { DomainName } from "@yac/util/infra/constructs/domainName";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacNotificationServiceStack extends Stack {
  public exports: YacNotificationServiceExports;

  constructor(scope: Construct, id: string, props: YacNotificationServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, domainNameAttributes, hostedZoneAttributes, certificateArn, gcmServerKey, authorizerHandlerFunctionArn, snsTopicArns } = props;

    // Databases
    const listenerMappingTable = new DynamoDB.Table(this, `ListenerMappingTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    listenerMappingTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
    });

    // SNS Topics
    const pushNotificationFailedSnsTopic = new SNS.Topic(this, `PushNotificationFailedSnsTopic_${id}`, { topicName: `PushNotificationFailedSnsTopic_${id}` });
    const userAddedToTeamSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToTeamSnsTopic_${id}`, snsTopicArns.userAddedToTeam);
    const userRemovedFromTeamSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromTeamSnsTopic_${id}`, snsTopicArns.userRemovedFromTeam);
    const userAddedToGroupSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToGroupSnsTopic_${id}`, snsTopicArns.userAddedToGroup);
    const userRemovedFromGroupSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromGroupSnsTopic_${id}`, snsTopicArns.userRemovedFromGroup);
    const userAddedToMeetingSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToMeetingSnsTopic_${id}`, snsTopicArns.userAddedToMeeting);
    const userRemovedFromMeetingSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromMeetingSnsTopic_${id}`, snsTopicArns.userRemovedFromMeeting);
    const userAddedAsFriendSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedAsFriendSnsTopic_${id}`, snsTopicArns.userAddedAsFriend);
    const userRemovedAsFriendSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedAsFriendSnsTopic_${id}`, snsTopicArns.userRemovedAsFriend);
    const teamCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `TeamCreatedSnsTopic_${id}`, snsTopicArns.teamCreated);
    const groupCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `GroupCreatedSnsTopic_${id}`, snsTopicArns.groupCreated);
    const messageCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageCreatedSnsTopic_${id}`, snsTopicArns.messageCreated);
    const messageUpdatedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageUpdatedSnsTopic_${id}`, snsTopicArns.messageUpdated);

    // SNS Push Notification Platform Application
    const platformApplicationPlatform = "GCM";
    const platformApplicationName = `PlatformApplication_${id}`;
    const platformApplicationArn = `arn:aws:sns:${this.region}:${this.account}:app/${platformApplicationPlatform}/${platformApplicationName}`;

    new CustomResources.AwsCustomResource(this, `PlatformApplicationCustomResource_${id}`, {
      resourceType: "Custom::PlatformApplication",
      installLatestAwsSdk: false,
      onCreate: {
        region: this.region,
        service: "SNS",
        action: "createPlatformApplication",
        parameters: {
          Name: platformApplicationName,
          Platform: platformApplicationPlatform,
          Attributes: {
            PlatformCredential: gcmServerKey,
            EventDeliveryFailure: pushNotificationFailedSnsTopic.topicArn,
          },
        },
        physicalResourceId: CustomResources.PhysicalResourceId.of(platformApplicationName),
      },
      onUpdate: {
        region: this.region,
        service: "SNS",
        action: "setPlatformApplicationAttributes",
        parameters: {
          PlatformApplicationArn: platformApplicationArn,
          Attributes: {
            PlatformCredential: gcmServerKey,
            EventDeliveryFailure: pushNotificationFailedSnsTopic.topicArn,
          },
        },
        physicalResourceId: CustomResources.PhysicalResourceId.of(platformApplicationName),
      },
      onDelete: {
        region: this.region,
        service: "SNS",
        action: "deletePlatformApplication",
        parameters: { PlatformApplicationArn: platformApplicationArn },
        physicalResourceId: CustomResources.PhysicalResourceId.of(platformApplicationName),
      },
      policy: CustomResources.AwsCustomResourcePolicy.fromStatements([
        new IAM.PolicyStatement({
          actions: [ "*" ],
          resources: [ "*" ],
        }),
      ]),
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const listenerMappingTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ listenerMappingTable.tableArn, `${listenerMappingTable.tableArn}/*` ],
    });

    const createPlatformEndpointPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:CreatePlatformEndpoint" ],
      resources: [ platformApplicationArn ],
    });

    const sendPushNotificationPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ platformApplicationArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      NOTIFICATION_MAPPING_TABLE_NAME: listenerMappingTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      USER_ADDED_TO_TEAM_SNS_TOPIC_ARN: snsTopicArns.userAddedToTeam,
      USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromTeam,
      USER_ADDED_TO_GROUP_SNS_TOPIC_ARN: snsTopicArns.userAddedToGroup,
      USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromGroup,
      USER_ADDED_TO_MEETING_SNS_TOPIC_ARN: snsTopicArns.userAddedToMeeting,
      USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromMeeting,
      USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN: snsTopicArns.userAddedAsFriend,
      USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN: snsTopicArns.userRemovedAsFriend,
      TEAM_CREATED_SNS_TOPIC_ARN: snsTopicArns.teamCreated,
      GROUP_CREATED_SNS_TOPIC_ARN: snsTopicArns.groupCreated,
      MESSAGE_CREATED_SNS_TOPIC_ARN: snsTopicArns.messageCreated,
      MESSAGE_UPDATED_SNS_TOPIC_ARN: snsTopicArns.messageUpdated,
      MEETING_CREATED_SNS_TOPIC_ARN: snsTopicArns.meetingCreated,
      PLATFORM_APPLICATION_ARN: platformApplicationArn,
    };

    // SQS Queues
    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`);
    userAddedToTeamSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userRemovedFromTeamSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userAddedToGroupSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userRemovedFromGroupSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userAddedToMeetingSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userRemovedFromMeetingSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userAddedAsFriendSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userRemovedAsFriendSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    teamCreatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    groupCreatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    messageCreatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    messageUpdatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // WebSocket Lambdas
    const connectHandler = new Function(this, `ConnectHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/connect`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
    });

    const disconnectHandler = new Function(this, `DisconnectHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/disconnect`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
    });

    const authorizerHandler = Lambda.Function.fromFunctionArn(this, `AuthorizerHandler_${id}`, authorizerHandlerFunctionArn);

    // WebSocket API
    const webSocketDomainName = new DomainName(this, `WebSocketDomainName_${id}`, { environment, certificateArn, hostedZoneAttributes, recordNameSuffix: "ws" });

    const webSocketApi = new WebSocketApi(this, `WebSocketApi_${id}`, {
      connectRouteOptions: { integration: new ApiGatewayV2Integrations.WebSocketLambdaIntegration(`WebSocketConnectRouteIntegration_${id}`, connectHandler) },
      disconnectRouteOptions: { integration: new ApiGatewayV2Integrations.WebSocketLambdaIntegration(`WebSocketConnectRouteIntegration_${id}`, disconnectHandler) },
      authorizerHandler,
      defaultDomainMapping: {
        domainName: webSocketDomainName,
        mappingKey: "notification",
      },
    });

    // Add WebSocket API Endpoint to Environment Variables
    environmentVariables.WEBSOCKET_API_ENDPOINT = webSocketApi.endpoint;

    // Policy for publishing to Websocket API
    const executeWebSocketApiPolicyStatement = new IAM.PolicyStatement({
      actions: [ "execute-api:ManageConnections" ],
      resources: [ webSocketApi.apiArn ],
    });

    // SQS Event Lambda Handler
    new Function(this, `SqsEventHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/sqsEvent`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement, executeWebSocketApiPolicyStatement, sendPushNotificationPolicyStatement ],
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    // HTTP Lambdas
    const registerDeviceHandler = new Function(this, `RegisterDeviceHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/registerDevice`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement, createPlatformEndpointPolicyStatement ],
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/devices",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: registerDeviceHandler,
        restricted: true,
      },
    ];

    const httpApi = new HttpApi(this, `HttpApi_${id}`, {
      serviceName: "notification",
      domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes),
      authorizerHandler,
    });

    routes.forEach((route) => httpApi.addRoute(route));

    const ExportNames = generateExportNames(environment);

    this.exports = { snsTopicArns: { pushNotificationFailed: new CfnOutput(this, `PushNotificationFailedSnsTopicArnExport_${id}`, { exportName: ExportNames.PushNotificationFailedSnsTopicArn, value: pushNotificationFailedSnsTopic.topicArn }).value as string } };

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `ListenerMappingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/listener-mapping-table-name`,
      stringValue: listenerMappingTable.tableName,
    });

    new SSM.StringParameter(this, `PushNotificationFailedSnsTopicArnSsmParameter_-${id}`, {
      parameterName: `/yac-api-v4/${environment}/push-notification-failed-sns-topic-arn`,
      stringValue: pushNotificationFailedSnsTopic.topicArn,
    });
  }
}

export interface YacNotificationServiceStackProps extends StackProps {
  environment: string;
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  hostedZoneAttributes: Route53.HostedZoneAttributes;
  authorizerHandlerFunctionArn: string;
  certificateArn: string;
  gcmServerKey: string;
  snsTopicArns: {
    userCreated: string;
    organizationCreated: string;
    teamCreated: string;
    meetingCreated: string;
    groupCreated: string;

    userAddedToOrganization: string;
    userAddedToTeam: string;
    userAddedToGroup: string;
    userAddedToMeeting: string;
    userAddedAsFriend: string;

    userRemovedFromOrganization: string;
    userRemovedFromTeam: string;
    userRemovedFromGroup: string;
    userRemovedFromMeeting: string;
    userRemovedAsFriend: string;

    messageCreated: string;
    messageUpdated: string;

    messageTranscoded: string;
    messageTranscribed: string;
  }
}

export interface YacNotificationServiceExports {
  snsTopicArns: {
    pushNotificationFailed: string;
  }
}
