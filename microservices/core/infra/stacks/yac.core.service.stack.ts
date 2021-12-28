/* eslint-disable no-nested-ternary */
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
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_opensearchservice as OpenSearch,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Environment } from "@yac/util/src/enums/environment.enum";
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

    const { environment, domainNameAttributes, authorizerHandlerFunctionArn, snsTopicArns, s3BucketArns, secretArns } = props;

    // S3 Buckets
    const rawMessageS3Bucket = S3.Bucket.fromBucketArn(this, `RawMessageS3Bucket_${id}`, s3BucketArns.rawMessage);
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, s3BucketArns.enhancedMessage);
    const imageS3Bucket = new S3.Bucket(this, `ImageS3Bucket_${id}`, { removalPolicy: environment === Environment.Prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY });

    // SNS Topics
    const messageTranscodedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, snsTopicArns.messageTranscoded);
    const messageTranscribedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageTranscribedSnsTopic_${id}`, snsTopicArns.messageTranscribed);
    const userCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `UserCreatedSnsTopic_${id}`, snsTopicArns.userCreated);
    const billingPlanUpdatedSnsTopic = SNS.Topic.fromTopicArn(this, `BillingPlanUpdatedSnsTopic_${id}`, snsTopicArns.billingPlanUpdated);

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

    const openSearchInstanceType = environment === Environment.Prod ? "m6g.2xlarge.search"
      : environment === Environment.Stage || environment === Environment.Dev ? "t3.medium.search" : "t3.small.search";

    const openSearchDomain = new OpenSearch.Domain(this, `OpenSearchDomain_${id}`, {
      version: OpenSearch.EngineVersion.OPENSEARCH_1_0,
      domainName: id.toLowerCase(),
      capacity: {
        masterNodeInstanceType: openSearchInstanceType,
        masterNodes: 2,
        dataNodeInstanceType: openSearchInstanceType,
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
      resources: [ snsTopicArns.userCreated ],
    });

    const organizationCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.organizationCreated ],
    });

    const teamCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.teamCreated ],
    });

    const groupCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.groupCreated ],
    });

    const meetingCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.meetingCreated ],
    });

    const userAddedToOrganizationSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userAddedToOrganization ],
    });

    const userAddedToTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userAddedToTeam ],
    });

    const userAddedToGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userAddedToGroup ],
    });

    const userAddedToMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userAddedToMeeting ],
    });

    const userAddedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userAddedAsFriend ],
    });

    const userRemovedFromOrganizationSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userRemovedFromOrganization ],
    });

    const userRemovedFromTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userRemovedFromTeam ],
    });

    const userRemovedFromGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userRemovedFromGroup ],
    });

    const userRemovedFromMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userRemovedFromMeeting ],
    });

    const userRemovedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.userRemovedAsFriend ],
    });

    const messageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.messageCreated ],
    });

    const messageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.messageUpdated ],
    });

    const createUserRequestSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.createUserRequest ],
    });

    const getMessageUploadTokenSecretPolicyStatement = new IAM.PolicyStatement({
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ secretArns.messageUploadToken ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      CORE_TABLE_NAME: coreTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
      GSI_THREE_INDEX_NAME: GlobalSecondaryIndex.Three,

      USER_CREATED_SNS_TOPIC_ARN: snsTopicArns.userCreated,
      ORGANIZATION_CREATED_SNS_TOPIC_ARN: snsTopicArns.organizationCreated,
      TEAM_CREATED_SNS_TOPIC_ARN: snsTopicArns.teamCreated,
      GROUP_CREATED_SNS_TOPIC_ARN: snsTopicArns.groupCreated,
      MEETING_CREATED_SNS_TOPIC_ARN: snsTopicArns.meetingCreated,

      USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN: snsTopicArns.userAddedToOrganization,
      USER_ADDED_TO_TEAM_SNS_TOPIC_ARN: snsTopicArns.userAddedToTeam,
      USER_ADDED_TO_GROUP_SNS_TOPIC_ARN: snsTopicArns.userAddedToGroup,
      USER_ADDED_TO_MEETING_SNS_TOPIC_ARN: snsTopicArns.userAddedToMeeting,
      USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN: snsTopicArns.userAddedAsFriend,

      USER_REMOVED_FROM_ORGANIZATION_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromOrganization,
      USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromTeam,
      USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromGroup,
      USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromMeeting,
      USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN: snsTopicArns.userRemovedAsFriend,

      MESSAGE_CREATED_SNS_TOPIC_ARN: snsTopicArns.messageCreated,
      MESSAGE_UPDATED_SNS_TOPIC_ARN: snsTopicArns.messageUpdated,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: snsTopicArns.messageTranscoded,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: snsTopicArns.messageTranscribed,

      CREATE_USER_REQUEST_SNS_TOPIC_ARN: snsTopicArns.createUserRequest,

      BILLING_PLAN_UPDATED_SNS_TOPIC_ARN: snsTopicArns.billingPlanUpdated,

      RAW_MESSAGE_S3_BUCKET_NAME: rawMessageS3Bucket.bucketName,
      ENHANCED_MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      IMAGE_S3_BUCKET_NAME: imageS3Bucket.bucketName,

      OPEN_SEARCH_DOMAIN_ENDPOINT: openSearchDomain.domainEndpoint,
      MESSAGE_UPLOAD_TOKEN_SECRET_ID: secretArns.messageUploadToken,
    };

    // SQS Queues
    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`);
    messageTranscodedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    messageTranscribedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userCreatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    billingPlanUpdatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // Dynamo Stream Handler
    new Lambda.Function(this, `CoreTableEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/coreTableEvent`),
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
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/s3Event`),
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
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/sqsEvent`),
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
      domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes),
      authorizerHandler: Lambda.Function.fromFunctionArn(this, `AuthorizerHandler_${id}`, authorizerHandlerFunctionArn),
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
      parameterName: `/yac-api-v4/${environment}/core-table-name`,
      stringValue: coreTable.tableName,
    });

    new SSM.StringParameter(this, `ImageS3BucketNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/image-s3-bucket-name`,
      stringValue: imageS3Bucket.bucketName,
    });
  }
}

export interface YacCoreServiceStackProps extends StackProps {
  environment: string;
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  authorizerHandlerFunctionArn: string;
  secretArns: {
    messageUploadToken: string;
  };
  s3BucketArns: {
    rawMessage: string;
    enhancedMessage: string;
  };
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

    billingPlanUpdated: string;

    createUserRequest: string;
  }
}
