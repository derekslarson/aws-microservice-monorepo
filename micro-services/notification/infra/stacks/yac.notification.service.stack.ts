/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as SSM from "@aws-cdk/aws-ssm";
import * as SNS from "@aws-cdk/aws-sns";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as Route53 from "@aws-cdk/aws-route53";
import * as Route53Targets from "@aws-cdk/aws-route53-targets";
import { Environment, generateExportNames, LogLevel } from "@yac/util";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { WebSocketApi } from "../constructs/aws-apigatewayv2/webSocketApi.construct";
import { LambdaWebSocketIntegration } from "../constructs/aws-apigatewayv2-integrations/lambdaWebSocketIntegration.construct";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacNotificationServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // Imported SNS Topic ARNs from Util
    const userAddedToTeamSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToTeamSnsTopicArn);
    const userRemovedFromTeamSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromTeamSnsTopicArn);
    const userAddedToGroupSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToGroupSnsTopicArn);
    const userRemovedFromGroupSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromGroupSnsTopicArn);
    const userAddedToMeetingSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToMeetingSnsTopicArn);
    const userRemovedFromMeetingSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromMeetingSnsTopicArn);
    const userAddedAsFriendSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedAsFriendSnsTopicArn);
    const userRemovedAsFriendSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedAsFriendSnsTopicArn);
    const teamCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.TeamCreatedSnsTopicArn);
    const meetingCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingCreatedSnsTopicArn);
    const groupCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupCreatedSnsTopicArn);
    const friendMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.FriendMessageCreatedSnsTopicArn);
    const friendMessageUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.FriendMessageUpdatedSnsTopicArn);
    const groupMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupMessageCreatedSnsTopicArn);
    const groupMessageUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupMessageUpdatedSnsTopicArn);
    const meetingMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingMessageCreatedSnsTopicArn);
    const meetingMessageUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingMessageUpdatedSnsTopicArn);

    // Imported User Pool Id from Auth
    const userPoolId = CDK.Fn.importValue(ExportNames.UserPoolId);

    // Manually Set SSM Parameters Related to Route 53
    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    // Domain Name Related Resources
    const certificate = ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn);

    const hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, {
      zoneName: hostedZoneName,
      hostedZoneId,
    });

    const domainName = new ApiGatewayV2.DomainName(this, `DomainName_${id}`, { domainName: `${this.recordName}.${hostedZoneName}`, certificate });

    new Route53.ARecord(this, `ARecord_${id}`, {
      zone: hostedZone,
      recordName: this.recordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId)),
    });

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Databases
    const listenerMappingTable = new DynamoDB.Table(this, `ListenerMappingTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    listenerMappingTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const listenerMappingTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ listenerMappingTable.tableArn, `${listenerMappingTable.tableArn}/*` ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      NOTIFICATION_MAPPING_TABLE_NAME: listenerMappingTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      JWKS_URL: `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
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
      FRIEND_MESSAGE_CREATED_SNS_TOPIC_ARN: friendMessageCreatedSnsTopicArn,
      FRIEND_MESSAGE_UPDATED_SNS_TOPIC_ARN: friendMessageUpdatedSnsTopicArn,
      GROUP_MESSAGE_CREATED_SNS_TOPIC_ARN: groupMessageCreatedSnsTopicArn,
      GROUP_MESSAGE_UPDATED_SNS_TOPIC_ARN: groupMessageUpdatedSnsTopicArn,
      MEETING_MESSAGE_CREATED_SNS_TOPIC_ARN: meetingMessageCreatedSnsTopicArn,
      MEETING_MESSAGE_UPDATED_SNS_TOPIC_ARN: meetingMessageUpdatedSnsTopicArn,
      MEETING_CREATED_SNS_TOPIC_ARN: meetingCreatedSnsTopicArn,
    };

    // WebSocket Lambdas
    const connectHandler = new Lambda.Function(this, `ConnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/connect"),
      handler: "connect.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const disconnectHandler = new Lambda.Function(this, `DisconnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/disconnect"),
      handler: "disconnect.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    // WebSocket API
    const webSocketApi = new WebSocketApi(this, `WebSocketApi_${id}`, {
      connectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: connectHandler }) },
      disconnectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: disconnectHandler }) },
      defaultDomainMapping: {
        domainName,
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

    // SNS Event Lambda Handler
    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/snsEvent"),
      handler: "snsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, listenerMappingTableFullAccessPolicyStatement, executeWebSocketApiPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToTeamSnsTopic_${id}`, userAddedToTeamSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromTeamSnsTopic_${id}`, userRemovedFromTeamSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToGroupSnsTopic_${id}`, userAddedToGroupSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromGroupSnsTopic_${id}`, userRemovedFromGroupSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToMeetingSnsTopic_${id}`, userAddedToMeetingSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromMeetingSnsTopic_${id}`, userRemovedFromMeetingSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedAsFriendSnsTopic_${id}`, userAddedAsFriendSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedAsFriendSnsTopic_${id}`, userRemovedAsFriendSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `TeamCreatedSnsTopic_${id}`, teamCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `GroupCreatedSnsTopic_${id}`, groupCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `FriendMessageCreatedSnsTopic_${id}`, friendMessageCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `FriendMessageUpdatedSnsTopic_${id}`, friendMessageUpdatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `GroupMessageCreatedSnsTopic_${id}`, groupMessageCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `GroupMessageUpdatedSnsTopic_${id}`, groupMessageUpdatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MeetingMessageCreatedSnsTopic_${id}`, meetingMessageCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MeetingMessageUpdatedSnsTopic_${id}`, meetingMessageUpdatedSnsTopicArn)),
      ],
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `ListenerMappingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/listener-mapping-table-name`,
      stringValue: listenerMappingTable.tableName,
    });
  }

  public get recordName(): string {
    try {
      const environment = this.node.tryGetContext("environment") as string;
      const developer = this.node.tryGetContext("developer") as string;

      if (environment === Environment.Prod) {
        return "api-v4-ws";
      }

      if (environment === Environment.Dev) {
        return "develop-ws";
      }

      if (environment === Environment.Local) {
        return `${developer}-ws`;
      }

      return environment;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in YacNotificationService recordName getter:\n`, error);

      throw error;
    }
  }
}
