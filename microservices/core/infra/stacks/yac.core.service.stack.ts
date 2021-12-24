/* eslint-disable no-new */
import {
  RemovalPolicy,
  Duration,
  Stack,
  StackProps,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_sns_subscriptions as SnsSubscriptions,
  aws_sqs as SQS,
  aws_ec2 as EC2,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_s3 as S3,
  aws_secretsmanager as SecretsManager,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_opensearchservice as OpenSearch,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Environment } from "@yac/util/src/enums/environment.enum";
// import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { HttpApi } from "@yac/util/infra/constructs/http.api";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";
import { YacUserServiceNestedStack } from "./yac.user.service.nestedStack";
import { YacOrganizationServiceNestedStack } from "./yac.organization.service.nestedStack";
import { YacTeamServiceNestedStack } from "./yac.team.service.nestedStack";
import { YacGroupServiceNestedStack } from "./yac.group.service.nestedStack";
import { YacMeetingServiceNestedStack } from "./yac.meeting.service.nestedStack";
import { YacOneOnOneServiceNestedStack } from "./yac.oneOnOne.service.nestedStack";
import { YacMessageServiceNestedStack } from "./yac.message.service.nestedStack";
import { YacConversationServiceNestedStack } from "./yac.conversation.service.nestedStack";

export class YacCoreServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacCoreServiceStackProps) {
    super(scope, id, props);

    const { environment, stackPrefix, domainName, authorizerHandler, snsTopics, s3Buckets, secrets } = props;

    // const ExportNames = generateExportNames(stackPrefix);

    // S3 Buckets
    const imageS3Bucket = new S3.Bucket(this, `ImageS3Bucket_${id}`, { removalPolicy: environment === Environment.Prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY });

    // Databases
    const coreTable = new DynamoDB.Table(this, `CoreTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
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
      version: OpenSearch.EngineVersion.OPENSEARCH_1_0,
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
      resources: [ s3Buckets.rawMessage.bucketArn, `${s3Buckets.rawMessage.bucketArn}/*` ],
    });

    const enhancedMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ s3Buckets.enhancedMessage.bucketArn, `${s3Buckets.enhancedMessage.bucketArn}/*` ],
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
      resources: [ snsTopics.userCreated.topicArn ],
    });

    const organizationCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.organizationCreated.topicArn ],
    });

    const teamCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.teamCreated.topicArn ],
    });

    const groupCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.groupCreated.topicArn ],
    });

    const meetingCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.meetingCreated.topicArn ],
    });

    const userAddedToOrganizationSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userAddedToOrganization.topicArn ],
    });

    const userAddedToTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userAddedToTeam.topicArn ],
    });

    const userAddedToGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userAddedToGroup.topicArn ],
    });

    const userAddedToMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userAddedToMeeting.topicArn ],
    });

    const userAddedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userAddedAsFriend.topicArn ],
    });

    const userRemovedFromOrganizationSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userRemovedFromOrganization.topicArn ],
    });

    const userRemovedFromTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userRemovedFromTeam.topicArn ],
    });

    const userRemovedFromGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userRemovedFromGroup.topicArn ],
    });

    const userRemovedFromMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userRemovedFromMeeting.topicArn ],
    });

    const userRemovedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.userRemovedAsFriend.topicArn ],
    });

    const messageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.messageCreated.topicArn ],
    });

    const messageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.messageUpdated.topicArn ],
    });

    const createUserRequestSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.createUserRequest.topicArn ],
    });

    const getMessageUploadTokenSecretPolicyStatement = new IAM.PolicyStatement({
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ secrets.messageUploadToken.secretArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      CORE_TABLE_NAME: coreTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
      GSI_THREE_INDEX_NAME: GlobalSecondaryIndex.Three,

      USER_CREATED_SNS_TOPIC_ARN: snsTopics.userCreated.topicArn,
      ORGANIZATION_CREATED_SNS_TOPIC_ARN: snsTopics.organizationCreated.topicArn,
      TEAM_CREATED_SNS_TOPIC_ARN: snsTopics.teamCreated.topicArn,
      GROUP_CREATED_SNS_TOPIC_ARN: snsTopics.groupCreated.topicArn,
      MEETING_CREATED_SNS_TOPIC_ARN: snsTopics.meetingCreated.topicArn,

      USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN: snsTopics.userAddedToOrganization.topicArn,
      USER_ADDED_TO_TEAM_SNS_TOPIC_ARN: snsTopics.userAddedToTeam.topicArn,
      USER_ADDED_TO_GROUP_SNS_TOPIC_ARN: snsTopics.userAddedToGroup.topicArn,
      USER_ADDED_TO_MEETING_SNS_TOPIC_ARN: snsTopics.userAddedToMeeting.topicArn,
      USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN: snsTopics.userAddedAsFriend.topicArn,

      USER_REMOVED_FROM_ORGANIZATION_SNS_TOPIC_ARN: snsTopics.userRemovedFromOrganization.topicArn,
      USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN: snsTopics.userRemovedFromTeam.topicArn,
      USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN: snsTopics.userRemovedFromGroup.topicArn,
      USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN: snsTopics.userRemovedFromMeeting.topicArn,
      USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN: snsTopics.userRemovedAsFriend.topicArn,

      MESSAGE_CREATED_SNS_TOPIC_ARN: snsTopics.messageCreated.topicArn,
      MESSAGE_UPDATED_SNS_TOPIC_ARN: snsTopics.messageUpdated.topicArn,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: snsTopics.messageTranscoded.topicArn,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: snsTopics.messageTranscribed.topicArn,

      CREATE_USER_REQUEST_SNS_TOPIC_ARN: snsTopics.createUserRequest.topicArn,

      BILLING_PLAN_UPDATED_SNS_TOPIC_ARN: snsTopics.billingPlanUpdated.topicArn,

      RAW_MESSAGE_S3_BUCKET_NAME: s3Buckets.rawMessage.bucketName,
      ENHANCED_MESSAGE_S3_BUCKET_NAME: s3Buckets.enhancedMessage.bucketName,
      IMAGE_S3_BUCKET_NAME: imageS3Bucket.bucketName,

      OPEN_SEARCH_DOMAIN_ENDPOINT: openSearchDomain.domainEndpoint,
      MESSAGE_UPLOAD_TOKEN_SECRET_ID: secrets.messageUploadToken.secretArn,
    };

    // SQS Queues
    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`);
    snsTopics.messageTranscoded.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.messageTranscribed.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.userCreated.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    snsTopics.billingPlanUpdated.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // Dynamo Stream Handler
    new Lambda.Function(this, `CoreTableEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/coreTableEvent"),
      handler: "coreTableEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
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
        messageCreatedSnsPublishPolicyStatement,
        messageUpdatedSnsPublishPolicyStatement,
        createUserRequestSnsPublishPolicyStatement,
        openSearchFullAccessPolicyStatement,
      ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.DynamoEventSource(coreTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    // S3 Event Handler
    new Lambda.Function(this, `S3EventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/s3Event"),
      handler: "s3Event.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.S3EventSource(imageS3Bucket, { events: [ S3.EventType.OBJECT_CREATED ] }),
      ],
    });

    // SQS Event Handler
    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
      handler: "sqsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, getMessageUploadTokenSecretPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    const api = new HttpApi(this, `HttpApi_${id}`, {
      serviceName: "core",
      domainName,
      authorizerHandler,
    });

    new YacUserServiceNestedStack(this, `YacUserServiceNestedStack_${id}`, {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacOrganizationServiceNestedStack(this, `YacOrganizationServiceNestedStack_${id}`, {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacTeamServiceNestedStack(this, `YacTeamServiceNestedStack_${id}`, {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacGroupServiceNestedStack(this, `YacGroupServiceNestedStack_${id}`, {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
    });

    new YacMeetingServiceNestedStack(this, `YacMeetingServiceNestedStack_${id}`, {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    });

    new YacOneOnOneServiceNestedStack(this, `YacOneOnOneServiceNestedStack_${id}`, {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    });

    new YacMessageServiceNestedStack(this, `YacMessageServiceNestedStack_${id}`, {
      api,
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
      api,
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

export interface YacCoreServiceStackProps extends StackProps {
  environment: Environment;
  stackPrefix: string;
  domainName: ApiGatewayV2.IDomainName;
  authorizerHandler: Lambda.Function;
  secrets: {
    messageUploadToken: SecretsManager.Secret;
  };
  s3Buckets: {
    rawMessage: S3.Bucket;
    enhancedMessage: S3.Bucket;
  };
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
