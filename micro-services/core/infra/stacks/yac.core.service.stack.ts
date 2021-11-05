/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as SSM from "@aws-cdk/aws-ssm";
import * as S3 from "@aws-cdk/aws-s3";
import * as SNS from "@aws-cdk/aws-sns";
import * as EC2 from "@aws-cdk/aws-ec2";
import * as SecretsManager from "@aws-cdk/aws-secretsmanager";
import {
  Environment,
  generateExportNames,
  LogLevel,
  RouteProps,
} from "@yac/util";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import * as OpenSearch from "../constructs/aws-opensearch";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

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
    const messageTranscodedSnsTopicArn = CDK.Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn);
    const messageTranscribedSnsTopicArn = CDK.Fn.importValue(ExportNames.MessageTranscribedSnsTopicArn);
    const externalProviderUserSignedUpSnsTopicArn = CDK.Fn.importValue(ExportNames.ExternalProviderUserSignedUpSnsTopicArn);

    // Secret imports from Util
    const messageUploadTokenSecretArn = CDK.Fn.importValue(ExportNames.MessageUploadTokenSecretArn);

    // S3 Bucket ARN Imports from Util
    const rawMessageS3BucketArn = CDK.Fn.importValue(ExportNames.RawMessageS3BucketArn);
    const enhancedMessageS3BucketArn = CDK.Fn.importValue(ExportNames.EnhancedMessageS3BucketArn);

    // S3 Buckets
    const rawMessageS3Bucket = S3.Bucket.fromBucketArn(this, `RawMessageS3Bucket_${id}`, rawMessageS3BucketArn);
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, enhancedMessageS3BucketArn);
    const imageS3Bucket = new S3.Bucket(this, `ImageS3Bucket-${id}`, { ...(environment !== Environment.Prod && { removalPolicy: CDK.RemovalPolicy.DESTROY }) });

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

    const userAddedToTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedToTeamSnsTopicArn ],
    });

    const userRemovedFromTeamSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedFromTeamSnsTopicArn ],
    });

    const userAddedToGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedToGroupSnsTopicArn ],
    });

    const userRemovedFromGroupSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedFromGroupSnsTopicArn ],
    });

    const userAddedToMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedToMeetingSnsTopicArn ],
    });

    const teamCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ teamCreatedSnsTopicArn ],
    });

    const meetingCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ meetingCreatedSnsTopicArn ],
    });

    const userRemovedFromMeetingSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedFromMeetingSnsTopicArn ],
    });

    const userAddedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userAddedAsFriendSnsTopicArn ],
    });

    const userRemovedAsFriendSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userRemovedAsFriendSnsTopicArn ],
    });

    const groupCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ groupCreatedSnsTopicArn ],
    });

    const friendMessageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ friendMessageCreatedSnsTopicArn ],
    });

    const friendMessageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ friendMessageUpdatedSnsTopicArn ],
    });

    const groupMessageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ groupMessageCreatedSnsTopicArn ],
    });

    const groupMessageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ groupMessageUpdatedSnsTopicArn ],
    });

    const meetingMessageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ meetingMessageCreatedSnsTopicArn ],
    });

    const meetingMessageUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ meetingMessageUpdatedSnsTopicArn ],
    });

    const externalProviderUserSignedUpSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ externalProviderUserSignedUpSnsTopicArn ],
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
      USER_ADDED_TO_TEAM_SNS_TOPIC_ARN: userAddedToTeamSnsTopicArn,
      USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN: userRemovedFromTeamSnsTopicArn,
      USER_ADDED_TO_GROUP_SNS_TOPIC_ARN: userAddedToGroupSnsTopicArn,
      USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN: userRemovedFromGroupSnsTopicArn,
      TEAM_CREATED_SNS_TOPIC_ARN: teamCreatedSnsTopicArn,
      MEETING_CREATED_SNS_TOPIC_ARN: meetingCreatedSnsTopicArn,
      USER_ADDED_TO_MEETING_SNS_TOPIC_ARN: userAddedToMeetingSnsTopicArn,
      USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN: userRemovedFromMeetingSnsTopicArn,
      USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN: userAddedAsFriendSnsTopicArn,
      USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN: userRemovedAsFriendSnsTopicArn,
      GROUP_CREATED_SNS_TOPIC_ARN: groupCreatedSnsTopicArn,
      FRIEND_MESSAGE_CREATED_SNS_TOPIC_ARN: friendMessageCreatedSnsTopicArn,
      FRIEND_MESSAGE_UPDATED_SNS_TOPIC_ARN: friendMessageUpdatedSnsTopicArn,
      GROUP_MESSAGE_CREATED_SNS_TOPIC_ARN: groupMessageCreatedSnsTopicArn,
      GROUP_MESSAGE_UPDATED_SNS_TOPIC_ARN: groupMessageUpdatedSnsTopicArn,
      MEETING_MESSAGE_CREATED_SNS_TOPIC_ARN: meetingMessageCreatedSnsTopicArn,
      MEETING_MESSAGE_UPDATED_SNS_TOPIC_ARN: meetingMessageUpdatedSnsTopicArn,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: messageTranscodedSnsTopicArn,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: messageTranscribedSnsTopicArn,
      EXTERNAL_PROVIDER_USER_SIGNED_UP_SNS_TOPIC_ARN: externalProviderUserSignedUpSnsTopicArn,
      RAW_MESSAGE_S3_BUCKET_NAME: rawMessageS3Bucket.bucketName,
      ENHANCED_MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      IMAGE_S3_BUCKET_NAME: imageS3Bucket.bucketName,
      OPEN_SEARCH_DOMAIN_ENDPOINT: openSearchDomain.domainEndpoint,
      MESSAGE_UPLOAD_TOKEN_SECRET_ID: messageUploadTokenSecret.secretArn,
    };

    // Dynamo Stream Handler
    new Lambda.Function(this, `CoreTableChanged_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/coreTableChanged"),
      handler: "coreTableChanged.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [
        ...basePolicy,
        coreTableFullAccessPolicyStatement,
        userCreatedSnsPublishPolicyStatement,
        userAddedToTeamSnsPublishPolicyStatement,
        userRemovedFromTeamSnsPublishPolicyStatement,
        userAddedToGroupSnsPublishPolicyStatement,
        userRemovedFromGroupSnsPublishPolicyStatement,
        userAddedToMeetingSnsPublishPolicyStatement,
        groupCreatedSnsPublishPolicyStatement,
        userRemovedFromMeetingSnsPublishPolicyStatement,
        userAddedAsFriendSnsPublishPolicyStatement,
        userRemovedAsFriendSnsPublishPolicyStatement,
        teamCreatedSnsPublishPolicyStatement,
        meetingCreatedSnsPublishPolicyStatement,
        friendMessageCreatedSnsPublishPolicyStatement,
        friendMessageUpdatedSnsPublishPolicyStatement,
        groupMessageCreatedSnsPublishPolicyStatement,
        groupMessageUpdatedSnsPublishPolicyStatement,
        meetingMessageCreatedSnsPublishPolicyStatement,
        meetingMessageUpdatedSnsPublishPolicyStatement,
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

    // SNS Event Handler
    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/snsEvent"),
      handler: "snsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, externalProviderUserSignedUpSnsPublishPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, messageTranscodedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MessageTranscribedSnsTopic_${id}`, messageTranscribedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `ExternalProviderUserSignedUpSnsTopic_${id}`, externalProviderUserSignedUpSnsTopicArn)),
      ],
    });

    // HTTP Event Handlers
    const createUserHandler = new Lambda.Function(this, `CreateUser_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createUser"),
      handler: "createUser.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUserHandler = new Lambda.Function(this, `GetUser_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUser"),
      handler: "getUser.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByTeamIdHandler = new Lambda.Function(this, `GetUsersByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByTeamId"),
      handler: "getUsersByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByGroupIdHandler = new Lambda.Function(this, `GetUsersByGroupId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByGroupId"),
      handler: "getUsersByGroupId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUsersByMeetingIdHandler = new Lambda.Function(this, `GetUsersByMeetingId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUsersByMeetingId"),
      handler: "getUsersByMeetingId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getUserImageUploadUrlHandler = new Lambda.Function(this, `GetUserImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getUserImageUploadUrl"),
      handler: "getUserImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    // Team Handlers
    const createTeamHandler = new Lambda.Function(this, `CreateTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createTeam"),
      handler: "createTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamHandler = new Lambda.Function(this, `GetTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeam"),
      handler: "getTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUsersToTeamHandler = new Lambda.Function(this, `AddUsersToTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersToTeam"),
      handler: "addUsersToTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromTeamHandler = new Lambda.Function(this, `RemoveUserFromTeam_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromTeam"),
      handler: "removeUserFromTeam.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamsByUserIdHandler = new Lambda.Function(this, `GetTeamsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeamsByUserId"),
      handler: "getTeamsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getTeamImageUploadUrlHandler = new Lambda.Function(this, `GetTeamImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getTeamImageUploadUrl"),
      handler: "getTeamImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    // Friend Handlers
    const addUsersAsFriendsHandler = new Lambda.Function(this, `AddUsersAsFriends_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersAsFriends"),
      handler: "addUsersAsFriends.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserAsFriendHandler = new Lambda.Function(this, `RemoveUserAsFriend_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserAsFriend"),
      handler: "removeUserAsFriend.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getFriendsByUserIdHandler = new Lambda.Function(this, `GetFriendsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getFriendsByUserId"),
      handler: "getFriendsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    // Group Handlers
    const createGroupHandler = new Lambda.Function(this, `CreateGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createGroup"),
      handler: "createGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupHandler = new Lambda.Function(this, `GetGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroup"),
      handler: "getGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUsersToGroupHandler = new Lambda.Function(this, `AddUsersToGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersToGroup"),
      handler: "addUsersToGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromGroupHandler = new Lambda.Function(this, `RemoveUserFromGroup_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromGroup"),
      handler: "removeUserFromGroup.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupsByUserIdHandler = new Lambda.Function(this, `GetGroupsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroupsByUserId"),
      handler: "getGroupsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupsByTeamIdHandler = new Lambda.Function(this, `GetGroupsByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroupsByTeamId"),
      handler: "getGroupsByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getGroupImageUploadUrlHandler = new Lambda.Function(this, `GetGroupImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getGroupImageUploadUrl"),
      handler: "getGroupImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    // Meeting Handlers
    const createMeetingHandler = new Lambda.Function(this, `CreateMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createMeeting"),
      handler: "createMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingHandler = new Lambda.Function(this, `GetMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeeting"),
      handler: "getMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const addUsersToMeetingHandler = new Lambda.Function(this, `AddUsersToMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersToMeeting"),
      handler: "addUsersToMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserFromMeetingHandler = new Lambda.Function(this, `RemoveUserFromMeeting_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserFromMeeting"),
      handler: "removeUserFromMeeting.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingsByUserIdHandler = new Lambda.Function(this, `GetMeetingsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeetingsByUserId"),
      handler: "getMeetingsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingsByTeamIdHandler = new Lambda.Function(this, `GetMeetingsByTeamId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeetingsByTeamId"),
      handler: "getMeetingsByTeamId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMeetingImageUploadUrlHandler = new Lambda.Function(this, `GetMeetingImageUploadUrl_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMeetingImageUploadUrl"),
      handler: "getMeetingImageUploadUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

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

    // Conversation Handlers
    const getConversationsByUserIdHandler = new Lambda.Function(this, `GetConversationsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getConversationsByUserId"),
      handler: "getConversationsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const userRoutes: RouteProps[] = [
      {
        path: "/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createUserHandler,
      },
      {
        path: "/users/{userId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUserHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByTeamIdHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByGroupIdHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByMeetingIdHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUserImageUploadUrlHandler,
        restricted: true,
      },
    ];

    const teamRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/teams",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createTeamHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/teams",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToTeamHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromTeamHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamImageUploadUrlHandler,
        restricted: true,
      },
    ];

    const friendRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/friends",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersAsFriendsHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/friends",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getFriendsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/friends/{friendId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserAsFriendHandler,
        restricted: true,
      },
    ];

    const groupRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/groups",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createGroupHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupsByTeamIdHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToGroupHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromGroupHandler,
        restricted: true,
      },
      {
        path: "/groups/{groupId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupImageUploadUrlHandler,
        restricted: true,
      },
    ];

    const meetingRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/meetings",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createMeetingHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToMeetingHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromMeetingHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/meetings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/teams/{teamId}/meetings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingsByTeamIdHandler,
        restricted: true,
      },
      {
        path: "/meetings/{meetingId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingImageUploadUrlHandler,
        restricted: true,
      },
    ];

    const messageRoutes: RouteProps[] = [
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

    const conversationRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/conversations",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getConversationsByUserIdHandler,
        restricted: true,
      },
    ];

    const routes: RouteProps[] = [
      ...userRoutes,
      ...teamRoutes,
      ...friendRoutes,
      ...groupRoutes,
      ...meetingRoutes,
      ...messageRoutes,
      ...conversationRoutes,
    ];

    routes.forEach((route) => this.httpApi.addRoute(route));

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
