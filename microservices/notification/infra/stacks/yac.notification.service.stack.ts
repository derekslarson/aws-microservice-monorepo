/* eslint-disable no-console */
/* eslint-disable no-new */
import {
  Fn,
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
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { WebSocketApi } from "@yac/util/infra/constructs/webSocket.api";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacNotificationServiceStack extends YacHttpServiceStack {
  constructor(scope: Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // Imported SNS Topic ARNs from Util
    const userAddedToTeamSnsTopicArn = Fn.importValue(ExportNames.UserAddedToTeamSnsTopicArn);
    const userRemovedFromTeamSnsTopicArn = Fn.importValue(ExportNames.UserRemovedFromTeamSnsTopicArn);
    const userAddedToGroupSnsTopicArn = Fn.importValue(ExportNames.UserAddedToGroupSnsTopicArn);
    const userRemovedFromGroupSnsTopicArn = Fn.importValue(ExportNames.UserRemovedFromGroupSnsTopicArn);
    const userAddedToMeetingSnsTopicArn = Fn.importValue(ExportNames.UserAddedToMeetingSnsTopicArn);
    const userRemovedFromMeetingSnsTopicArn = Fn.importValue(ExportNames.UserRemovedFromMeetingSnsTopicArn);
    const userAddedAsFriendSnsTopicArn = Fn.importValue(ExportNames.UserAddedAsFriendSnsTopicArn);
    const userRemovedAsFriendSnsTopicArn = Fn.importValue(ExportNames.UserRemovedAsFriendSnsTopicArn);
    const teamCreatedSnsTopicArn = Fn.importValue(ExportNames.TeamCreatedSnsTopicArn);
    const meetingCreatedSnsTopicArn = Fn.importValue(ExportNames.MeetingCreatedSnsTopicArn);
    const groupCreatedSnsTopicArn = Fn.importValue(ExportNames.GroupCreatedSnsTopicArn);

    const messageCreatedSnsTopicArn = Fn.importValue(ExportNames.MessageCreatedSnsTopicArn);
    const messageUpdatedSnsTopicArn = Fn.importValue(ExportNames.MessageUpdatedSnsTopicArn);

    const authorizerHandlerFunctionArn = Fn.importValue(ExportNames.AuthorizerHandlerFunctionArn);

    const pushNotificationFailedSnsTopic = new SNS.Topic(this, `PushNotificationFailedSnsTopic_${id}`, { topicName: `PushNotificationFailedSnsTopic_${id}` });

    // Imported SSM Parameters
    const gcmServerKey = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/gcm-server-key`);

    // Imported User Pool Id from Auth
    // const userPoolId = Fn.importValue(ExportNames.UserPoolId);

    // SNS Topics
    const userAddedToTeamSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToTeamSnsTopic_${id}`, userAddedToTeamSnsTopicArn);
    const userRemovedFromTeamSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromTeamSnsTopic_${id}`, userRemovedFromTeamSnsTopicArn);
    const userAddedToGroupSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToGroupSnsTopic_${id}`, userAddedToGroupSnsTopicArn);
    const userRemovedFromGroupSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromGroupSnsTopic_${id}`, userRemovedFromGroupSnsTopicArn);
    const userAddedToMeetingSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToMeetingSnsTopic_${id}`, userAddedToMeetingSnsTopicArn);
    const userRemovedFromMeetingSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromMeetingSnsTopic_${id}`, userRemovedFromMeetingSnsTopicArn);
    const userAddedAsFriendSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedAsFriendSnsTopic_${id}`, userAddedAsFriendSnsTopicArn);
    const userRemovedAsFriendSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedAsFriendSnsTopic_${id}`, userRemovedAsFriendSnsTopicArn);
    const teamCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `TeamCreatedSnsTopic_${id}`, teamCreatedSnsTopicArn);
    const groupCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `GroupCreatedSnsTopic_${id}`, groupCreatedSnsTopicArn);
    const messageCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageCreatedSnsTopic_${id}`, messageCreatedSnsTopicArn);
    const messageUpdatedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageUpdatedSnsTopic_${id}`, messageUpdatedSnsTopicArn);

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
      JWKS_URL: `https://cognito-idp.${this.region}.amazonaws.com/test/.well-known/jwks.json`,
      USER_ADDED_TO_TEAM_SNS_TOPIC_ARN: userAddedToTeamSnsTopicArn,
      USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN: userRemovedFromTeamSnsTopicArn,
      USER_ADDED_TO_GROUP_SNS_TOPIC_ARN: userAddedToGroupSnsTopicArn,
      USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN: userRemovedFromGroupSnsTopicArn,
      USER_ADDED_TO_MEETING_SNS_TOPIC_ARN: userAddedToMeetingSnsTopicArn,
      USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN: userRemovedFromMeetingSnsTopicArn,
      USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN: userAddedAsFriendSnsTopicArn,
      USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN: userRemovedAsFriendSnsTopicArn,
      TEAM_CREATED_SNS_TOPIC_ARN: teamCreatedSnsTopicArn,
      GROUP_CREATED_SNS_TOPIC_ARN: groupCreatedSnsTopicArn,
      MESSAGE_CREATED_SNS_TOPIC_ARN: messageCreatedSnsTopicArn,
      MESSAGE_UPDATED_SNS_TOPIC_ARN: messageUpdatedSnsTopicArn,
      MEETING_CREATED_SNS_TOPIC_ARN: meetingCreatedSnsTopicArn,
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
    const connectHandler = new Lambda.Function(this, `ConnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/connect"),
      handler: "connect.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const disconnectHandler = new Lambda.Function(this, `DisconnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/disconnect"),
      handler: "disconnect.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    // WebSocket API
    const webSocketDomainName = new ApiGatewayV2.DomainName(this, `WebSocketDomainName_${id}`, { domainName: `${this.webSocketRecordName}.${this.zoneName}`, certificate: this.certificate });

    new Route53.ARecord(this, `ARecord_${id}`, {
      zone: this.hostedZone,
      recordName: this.webSocketRecordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2DomainProperties(webSocketDomainName.regionalDomainName, webSocketDomainName.regionalHostedZoneId)),
    });

    const authorizerHandler = Lambda.Function.fromFunctionArn(this, `AuthorizerHandler_${id}`, authorizerHandlerFunctionArn);

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
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
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
      code: Lambda.Code.fromAsset("dist/handlers/registerDevice"),
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

    routes.forEach((route) => this.httpApi.addRoute(route));

    // PushNotificationFailedSnsTopic ARN Export (to be imported by test stack)
    new CfnOutput(this, `PushNotificationFailedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.PushNotificationFailedSnsTopicArn,
      value: pushNotificationFailedSnsTopic.topicArn,
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `ListenerMappingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/listener-mapping-table-name`,
      stringValue: listenerMappingTable.tableName,
    });

    new SSM.StringParameter(this, `PushNotificationFailedSnsTopicArnSsmParameter_-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/push-notification-failed-sns-topic-arn`,
      stringValue: pushNotificationFailedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `PlatformApplicationArnSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/platform-application-arn`,
      stringValue: platformApplicationArn,
    });
  }

  public get webSocketRecordName(): string {
    try {
      return `${this.recordName}-ws`;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in webSocketRecordName recordName getter:\n`, error);

      throw error;
    }
  }
}
