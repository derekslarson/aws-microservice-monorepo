/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as SSM from "@aws-cdk/aws-ssm";
import * as S3 from "@aws-cdk/aws-s3";
import * as SNS from "@aws-cdk/aws-sns";
import * as SNSSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import * as SQS from "@aws-cdk/aws-sqs";
import * as EC2 from "@aws-cdk/aws-ec2";
import * as SecretsManager from "@aws-cdk/aws-secretsmanager";
import {
  Environment,
  generateExportNames,
  LogLevel,
} from "@yac/util";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import * as OpenSearch from "../constructs/aws-opensearch";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";
import { YacUserServiceNestedStack } from "./yac.user.service.nestedStack";
import { YacOrganizationServiceNestedStack } from "./yac.organization.service.nestedStack";
import { YacTeamServiceNestedStack } from "./yac.team.service.nestedStack";
import { YacGroupServiceNestedStack } from "./yac.group.service.nestedStack";
import { YacMeetingServiceNestedStack } from "./yac.meeting.service.nestedStack";
import { YacOneOnOneServiceNestedStack } from "./yac.oneOnOne.service.nestedStack";
import { YacMessageServiceNestedStack } from "./yac.message.service.nestedStack";
import { YacConversationServiceNestedStack } from "./yac.conversation.service.nestedStack";

export class YacCoreServiceStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as Environment | undefined;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    if (!Object.values(Environment).includes(environment)) {
      throw new Error("'environment' context param malformed.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // SNS Topic ARN Imports from Util
    const userCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.UserCreatedSnsTopicArn);
    const organizationCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.OrganizationCreatedSnsTopicArn);
    const teamCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.TeamCreatedSnsTopicArn);
    const meetingCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingCreatedSnsTopicArn);
    const groupCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupCreatedSnsTopicArn);

    const userAddedToOrganizationSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToOrganizationSnsTopicArn);
    const userAddedToTeamSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToTeamSnsTopicArn);
    const userAddedToGroupSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToGroupSnsTopicArn);
    const userAddedToMeetingSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToMeetingSnsTopicArn);
    const userAddedAsFriendSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedAsFriendSnsTopicArn);

    const userRemovedFromOrganizationSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromOrganizationSnsTopicArn);
    const userRemovedFromTeamSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromTeamSnsTopicArn);
    const userRemovedFromGroupSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromGroupSnsTopicArn);
    const userRemovedFromMeetingSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromMeetingSnsTopicArn);
    const userRemovedAsFriendSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedAsFriendSnsTopicArn);

    const friendMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.FriendMessageCreatedSnsTopicArn);
    const groupMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupMessageCreatedSnsTopicArn);
    const meetingMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingMessageCreatedSnsTopicArn);

    const friendMessageUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.FriendMessageUpdatedSnsTopicArn);
    const groupMessageUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupMessageUpdatedSnsTopicArn);
    const meetingMessageUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingMessageUpdatedSnsTopicArn);

    const messageTranscodedSnsTopicArn = CDK.Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn);
    const messageTranscribedSnsTopicArn = CDK.Fn.importValue(ExportNames.MessageTranscribedSnsTopicArn);

    const createUserRequestSnsTopicArn = CDK.Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn);

    const billingPlanUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.BillingPlanUpdatedSnsTopicArn);

    // Secret imports from Util
    const messageUploadTokenSecretArn = CDK.Fn.importValue(ExportNames.MessageUploadTokenSecretArn);

    // S3 Bucket ARN Imports from Util
    const rawMessageS3BucketArn = CDK.Fn.importValue(ExportNames.RawMessageS3BucketArn);
    const enhancedMessageS3BucketArn = CDK.Fn.importValue(ExportNames.EnhancedMessageS3BucketArn);

    // S3 Buckets
    const rawMessageS3Bucket = S3.Bucket.fromBucketArn(this, `RawMessageS3Bucket_${id}`, rawMessageS3BucketArn);
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, enhancedMessageS3BucketArn);
    const imageS3Bucket = new S3.Bucket(this, `ImageS3Bucket-${id}`, { ...(environment !== Environment.Prod && { removalPolicy: CDK.RemovalPolicy.DESTROY }) });

    // SNS Topics
    const messageTranscodedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, messageTranscodedSnsTopicArn);
    const messageTranscribedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageTranscribedSnsTopic_${id}`, messageTranscribedSnsTopicArn);
    const userCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `UserCreatedSnsTopic_${id}`, userCreatedSnsTopicArn);
    const billingPlanUpdatedSnsTopic = SNS.Topic.fromTopicArn(this, `BillingPlanUpdatedSnsTopic_${id}`, billingPlanUpdatedSnsTopicArn);

    // Secrets
    const messageUploadTokenSecret = SecretsManager.Secret.fromSecretCompleteArn(this, `MessageUploadTokenSecret_${id}`, messageUploadTokenSecretArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Databases
    const coreTable = new DynamoDB.Table(this, `CoreTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      stream: DynamoDB.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.Two,
      partitionKey: { name: "gsi2pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: DynamoDB.AttributeType.STRING },
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.Three,
      partitionKey: { name: "gsi3pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi3sk", type: DynamoDB.AttributeType.STRING },
    });

    const openSearchInstanceTypeMap: Record<Environment, string> = {
      [Environment.Local]: "t3.small.search",
      [Environment.Dev]: "t3.medium.search",
      [Environment.Stage]: "t3.medium.search",
      [Environment.Prod]: "m6g.2xlarge.search",
    };

    // OpenSearch Domain
    const openSearchDomain = new OpenSearch.Domain(this, `OpenSearchDomain_${id}`, {
      version: OpenSearch.Version.V1_0,
      domainName: id.toLowerCase(),
      capacity: {
        masterNodeInstanceType: openSearchInstanceTypeMap[environment],
        masterNodes: 2,
        dataNodeInstanceType: openSearchInstanceTypeMap[environment],
        dataNodes: 1,
      },
      ebs: {
        enabled: true,
        volumeSize: 10,
        volumeType: EC2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
      },
      nodeToNodeEncryption: true,
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const coreTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ coreTable.tableArn, `${coreTable.tableArn}/*` ],
    });

    const rawMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ rawMessageS3Bucket.bucketArn, `${rawMessageS3Bucket.bucketArn}/*` ],
    });

    const enhancedMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ enhancedMessageS3Bucket.bucketArn, `${enhancedMessageS3Bucket.bucketArn}/*` ],
    });

    const imageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ imageS3Bucket.bucketArn, `${imageS3Bucket.bucketArn}/*` ],
    });

    const openSearchFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "es:*" ],
      resources: [ "*" ],
    });

    const userCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userCreatedSnsTopicArn ],
    });

    const organizationCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ organizationCreatedSnsTopicArn ],
    });

    const teamCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ teamCreatedSnsTopicArn ],
    });

    const groupCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ groupCreatedSnsTopicArn ],
    });

    const meetingCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ meetingCreatedSnsTopicArn ],
    });

    const userAddedToOrganizationSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedToOrganizationSnsTopicArn ],
    });

    const userAddedToTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedToTeamSnsTopicArn ],
    });

    const userAddedToGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedToGroupSnsTopicArn ],
    });

    const userAddedToMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedToMeetingSnsTopicArn ],
    });

    const userAddedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedAsFriendSnsTopicArn ],
    });

    const userRemovedFromOrganizationSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedFromOrganizationSnsTopicArn ],
    });

    const userRemovedFromTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedFromTeamSnsTopicArn ],
    });

    const userRemovedFromGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedFromGroupSnsTopicArn ],
    });

    const userRemovedFromMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedFromMeetingSnsTopicArn ],
    });

    const userRemovedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedAsFriendSnsTopicArn ],
    });

    const friendMessageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ friendMessageCreatedSnsTopicArn ],
    });

    const groupMessageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ groupMessageCreatedSnsTopicArn ],
    });

    const meetingMessageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ meetingMessageCreatedSnsTopicArn ],
    });

    const friendMessageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ friendMessageUpdatedSnsTopicArn ],
    });

    const groupMessageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ groupMessageUpdatedSnsTopicArn ],
    });

    const meetingMessageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ meetingMessageUpdatedSnsTopicArn ],
    });

    const createUserRequestSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ createUserRequestSnsTopicArn ],
    });

    const getMessageUploadTokenSecretPolicyStatement = new IAM.PolicyStatement({
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ messageUploadTokenSecret.secretArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      CORE_TABLE_NAME: coreTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
      GSI_THREE_INDEX_NAME: GlobalSecondaryIndex.Three,

      USER_CREATED_SNS_TOPIC_ARN: userCreatedSnsTopicArn,
      ORGANIZATION_CREATED_SNS_TOPIC_ARN: organizationCreatedSnsTopicArn,
      TEAM_CREATED_SNS_TOPIC_ARN: teamCreatedSnsTopicArn,
      GROUP_CREATED_SNS_TOPIC_ARN: groupCreatedSnsTopicArn,
      MEETING_CREATED_SNS_TOPIC_ARN: meetingCreatedSnsTopicArn,

      USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN: userAddedToOrganizationSnsTopicArn,
      USER_ADDED_TO_TEAM_SNS_TOPIC_ARN: userAddedToTeamSnsTopicArn,
      USER_ADDED_TO_GROUP_SNS_TOPIC_ARN: userAddedToGroupSnsTopicArn,
      USER_ADDED_TO_MEETING_SNS_TOPIC_ARN: userAddedToMeetingSnsTopicArn,
      USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN: userAddedAsFriendSnsTopicArn,

      USER_REMOVED_FROM_ORGANIZATION_SNS_TOPIC_ARN: userRemovedFromOrganizationSnsTopicArn,
      USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN: userRemovedFromTeamSnsTopicArn,
      USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN: userRemovedFromGroupSnsTopicArn,
      USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN: userRemovedFromMeetingSnsTopicArn,
      USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN: userRemovedAsFriendSnsTopicArn,

      FRIEND_MESSAGE_CREATED_SNS_TOPIC_ARN: friendMessageCreatedSnsTopicArn,
      GROUP_MESSAGE_CREATED_SNS_TOPIC_ARN: groupMessageCreatedSnsTopicArn,
      MEETING_MESSAGE_CREATED_SNS_TOPIC_ARN: meetingMessageCreatedSnsTopicArn,

      FRIEND_MESSAGE_UPDATED_SNS_TOPIC_ARN: friendMessageUpdatedSnsTopicArn,
      GROUP_MESSAGE_UPDATED_SNS_TOPIC_ARN: groupMessageUpdatedSnsTopicArn,
      MEETING_MESSAGE_UPDATED_SNS_TOPIC_ARN: meetingMessageUpdatedSnsTopicArn,

      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: messageTranscodedSnsTopicArn,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: messageTranscribedSnsTopicArn,

      CREATE_USER_REQUEST_SNS_TOPIC_ARN: createUserRequestSnsTopicArn,

      BILLING_PLAN_UPDATED_SNS_TOPIC_ARN: billingPlanUpdatedSnsTopicArn,

      RAW_MESSAGE_S3_BUCKET_NAME: rawMessageS3Bucket.bucketName,
      ENHANCED_MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      IMAGE_S3_BUCKET_NAME: imageS3Bucket.bucketName,

      OPEN_SEARCH_DOMAIN_ENDPOINT: openSearchDomain.domainEndpoint,
      MESSAGE_UPLOAD_TOKEN_SECRET_ID: messageUploadTokenSecret.secretArn,
    };

    // SQS Queues
    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`);
    messageTranscodedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    messageTranscribedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userCreatedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    billingPlanUpdatedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // Dynamo Stream Handler
    new Lambda.Function(this, `CoreTableEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/coreTableEvent"),
      handler: "coreTableEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [
        ...basePolicy,
        coreTableFullAccessPolicyStatement,
        userCreatedSnsPublishPolicyStatement,
        organizationCreatedSnsPublishPolicyStatement,
        teamCreatedSnsPublishPolicyStatement,
        groupCreatedSnsPublishPolicyStatement,
        meetingCreatedSnsPublishPolicyStatement,
        userAddedToOrganizationSnsPublishPolicyStatement,
        userAddedToTeamSnsPublishPolicyStatement,
        userAddedToGroupSnsPublishPolicyStatement,
        userAddedToMeetingSnsPublishPolicyStatement,
        userAddedAsFriendSnsPublishPolicyStatement,
        userRemovedFromOrganizationSnsPublishPolicyStatement,
        userRemovedFromTeamSnsPublishPolicyStatement,
        userRemovedFromGroupSnsPublishPolicyStatement,
        userRemovedFromMeetingSnsPublishPolicyStatement,
        userRemovedAsFriendSnsPublishPolicyStatement,
        friendMessageCreatedSnsPublishPolicyStatement,
        groupMessageCreatedSnsPublishPolicyStatement,
        meetingMessageCreatedSnsPublishPolicyStatement,
        friendMessageUpdatedSnsPublishPolicyStatement,
        groupMessageUpdatedSnsPublishPolicyStatement,
        meetingMessageUpdatedSnsPublishPolicyStatement,
        createUserRequestSnsPublishPolicyStatement,
        openSearchFullAccessPolicyStatement,
      ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.DynamoEventSource(coreTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    // S3 Event Handler
    new Lambda.Function(this, `S3EventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/s3Event"),
      handler: "s3Event.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.S3EventSource(imageS3Bucket, { events: [ S3.EventType.OBJECT_CREATED ] }),
      ],
    });

    // SQS Event Handler
    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
      handler: "sqsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    new YacUserServiceNestedStack(this, `YacUserServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacOrganizationServiceNestedStack(this, `YacOrganizationServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacTeamServiceNestedStack(this, `YacTeamServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacGroupServiceNestedStack(this, `YacGroupServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacMeetingServiceNestedStack(this, `YacMeetingServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacOneOnOneServiceNestedStack(this, `YacOneOnOneServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    });

    new YacMessageServiceNestedStack(this, `YacMessageServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
      rawMessageS3BucketFullAccessPolicyStatement,
      enhancedMessageS3BucketFullAccessPolicyStatement,
      getMessageUploadTokenSecretPolicyStatement,
    });

    new YacConversationServiceNestedStack(this, `YacConversationServiceNestedStack_${id}`, {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
      enhancedMessageS3BucketFullAccessPolicyStatement,
    });

    new SSM.StringParameter(this, `CoreTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/core-table-name`,
      stringValue: coreTable.tableName,
    });

    new SSM.StringParameter(this, `ImageS3BucketNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/image-s3-bucket-name`,
      stringValue: imageS3Bucket.bucketName,
    });
  }
}
