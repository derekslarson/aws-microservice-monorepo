/* eslint-disable no-nested-ternary */
/* eslint-disable no-console */
/* eslint-disable no-new */
import {
  Duration,
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
  aws_route53_targets as Route53Targets,
  StackProps,
  aws_certificatemanager as ACM,
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
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacNotificationServiceStack extends Stack {
  public pushNotificationFailedSnsTopic: SNS.ITopic;

  constructor(scope: Construct, id: string, props: YacNotificationServiceStackProps) {
    super(scope, id, props);

    const { environment, domainName, hostedZone, certificate, gcmServerKey, authorizerHandler, snsTopics } = props;

    this.pushNotificationFailedSnsTopic = new SNS.Topic(this, `PushNotificationFailedSnsTopic_${id}`, { topicName: `PushNotificationFailedSnsTopic_${id}` });

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
            EventDeliveryFailure: this.pushNotificationFailedSnsTopic.topicArn,
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
            EventDeliveryFailure: this.pushNotificationFailedSnsTopic.topicArn,
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
      USER_ADDED_TO_TEAM_SNS_TOPIC_ARN: snsTopics.userAddedToTeam.topicArn,
      USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN: snsTopics.userRemovedFromTeam.topicArn,
      USER_ADDED_TO_GROUP_SNS_TOPIC_ARN: snsTopics.userAddedToGroup.topicArn,
      USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN: snsTopics.userRemovedFromGroup.topicArn,
      USER_ADDED_TO_MEETING_SNS_TOPIC_ARN: snsTopics.userAddedToMeeting.topicArn,
      USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN: snsTopics.userRemovedFromMeeting.topicArn,
      USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN: snsTopics.userAddedAsFriend.topicArn,
      USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN: snsTopics.userRemovedAsFriend.topicArn,
      TEAM_CREATED_SNS_TOPIC_ARN: snsTopics.teamCreated.topicArn,
      GROUP_CREATED_SNS_TOPIC_ARN: snsTopics.groupCreated.topicArn,
      MESSAGE_CREATED_SNS_TOPIC_ARN: snsTopics.messageCreated.topicArn,
      MESSAGE_UPDATED_SNS_TOPIC_ARN: snsTopics.messageUpdated.topicArn,
      MEETING_CREATED_SNS_TOPIC_ARN: snsTopics.meetingCreated.topicArn,
      PLATFORM_APPLICATION_ARN: platformApplicationArn,
    };

    // SQS Queues
    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`);
    snsTopics.userAddedToTeam.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userRemovedFromTeam.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userAddedToGroup.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userRemovedFromGroup.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userAddedToMeeting.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userRemovedFromMeeting.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userAddedAsFriend.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userRemovedAsFriend.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.teamCreated.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.groupCreated.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.messageCreated.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.messageUpdated.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // WebSocket Lambdas
    const connectHandler = new Lambda.Function(this, `ConnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/connect`),
      handler: "connect.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const disconnectHandler = new Lambda.Function(this, `DisconnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/disconnect`),
      handler: "disconnect.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const webSocketRecordName = environment === Environment.Prod ? "api-v4-ws" : environment === Environment.Dev ? "develop-ws" : `${environment}-ws`;

    // WebSocket API
    const webSocketDomainName = new ApiGatewayV2.DomainName(this, `WebSocketDomainName_${id}`, { domainName: `${webSocketRecordName}.${hostedZone.zoneName}`, certificate });

    new Route53.ARecord(this, `ARecord_${id}`, {
      zone: hostedZone,
      recordName: webSocketRecordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2DomainProperties(webSocketDomainName.regionalDomainName, webSocketDomainName.regionalHostedZoneId)),
    });

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
    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/sqsEvent`),
      handler: "sqsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement, executeWebSocketApiPolicyStatement, sendPushNotificationPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    // HTTP Lambdas
    const registerDeviceHandler = new Lambda.Function(this, `RegisterDeviceHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/registerDevice`),
      handler: "registerDevice.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement, createPlatformEndpointPolicyStatement ],
      timeout: Duration.seconds(15),
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
      domainName,
      authorizerHandler,
    });

    routes.forEach((route) => httpApi.addRoute(route));

    const ExportNames = generateExportNames(environment);

    // PushNotificationFailedSnsTopic ARN Export (to be imported by test stack)
    new CfnOutput(this, `PushNotificationFailedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.PushNotificationFailedSnsTopicArn,
      value: this.pushNotificationFailedSnsTopic.topicArn,
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `ListenerMappingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/listener-mapping-table-name`,
      stringValue: listenerMappingTable.tableName,
    });

    new SSM.StringParameter(this, `PushNotificationFailedSnsTopicArnSsmParameter_-${id}`, {
      parameterName: `/yac-api-v4/${environment}/push-notification-failed-sns-topic-arn`,
      stringValue: this.pushNotificationFailedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `PlatformApplicationArnSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/platform-application-arn`,
      stringValue: platformApplicationArn,
    });
  }
}

export interface YacNotificationServiceStackProps extends StackProps {
  environment: string;
  domainName: ApiGatewayV2.IDomainName;
  authorizerHandler: Lambda.Function;
  hostedZone: Route53.IHostedZone;
  certificate: ACM.ICertificate;
  gcmServerKey: string;
  snsTopics: {
    userCreated: SNS.Topic;
    organizationCreated: SNS.Topic;
    teamCreated: SNS.Topic;
    meetingCreated: SNS.Topic;
    groupCreated: SNS.Topic;

    userAddedToOrganization: SNS.Topic;
    userAddedToTeam: SNS.Topic;
    userAddedToGroup: SNS.Topic;
    userAddedToMeeting: SNS.Topic;
    userAddedAsFriend: SNS.Topic;

    userRemovedFromOrganization: SNS.Topic;
    userRemovedFromTeam: SNS.Topic;
    userRemovedFromGroup: SNS.Topic;
    userRemovedFromMeeting: SNS.Topic;
    userRemovedAsFriend: SNS.Topic;

    messageCreated: SNS.Topic;
    messageUpdated: SNS.Topic;

    messageTranscoded: SNS.Topic;
    messageTranscribed: SNS.Topic;

    billingPlanUpdated: SNS.Topic;

    createUserRequest: SNS.Topic;
  }
}
