/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as SSM from "@aws-cdk/aws-ssm";
import * as S3 from "@aws-cdk/aws-s3";
import * as S3Notifications from "@aws-cdk/aws-s3-notifications";
import {
  Environment,
  generateExportNames,
  LogLevel,
  RouteProps,
} from "@yac/util";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacCoreServiceStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
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
    const teamCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.TeamCreatedSnsTopicArn);
    const meetingCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingCreatedSnsTopicArn);

    // S3 Bucket ARN Imports from Util
    const messageS3BucketArn = CDK.Fn.importValue(ExportNames.MessageS3BucketArn);

    // S3 Buckets
    const messageS3Bucket = S3.Bucket.fromBucketArn(this, `MessageS3Bucket_${id}`, messageS3BucketArn);
    const imageS3Bucket = new S3.Bucket(this, `ImageS3Bucket-${id}`, {});

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

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const coreTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ coreTable.tableArn, `${coreTable.tableArn}/*` ],
    });

    const messageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ messageS3Bucket.bucketArn, `${messageS3Bucket.bucketArn}/*` ],
    });

    const imageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ imageS3Bucket.bucketArn, `${imageS3Bucket.bucketArn}/*` ],
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
      MESSAGE_S3_BUCKET_NAME: messageS3Bucket.bucketName,
      IMAGE_S3_BUCKET_NAME: imageS3Bucket.bucketName,
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
        userRemovedFromMeetingSnsPublishPolicyStatement,
        userAddedAsFriendSnsPublishPolicyStatement,
        teamCreatedSnsPublishPolicyStatement,
        meetingCreatedSnsPublishPolicyStatement,
      ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.DynamoEventSource(coreTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    // Dynamo Stream Handler
    new Lambda.Function(this, `ImageFileCreated_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/imageFileCreated"),
      handler: "imageFileCreated.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.S3EventSource(imageS3Bucket, { events: [ S3.EventType.OBJECT_CREATED ] }),
      ],
    });

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
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
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

    // Message Handlers
    const messageFileCreatedHandler = new Lambda.Function(this, `MessageFileCreated_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/messageFileCreated"),
      handler: "messageFileCreated.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    messageS3Bucket.addObjectCreatedNotification(new S3Notifications.LambdaDestination(messageFileCreatedHandler));

    const createFriendMessageHandler = new Lambda.Function(this, `CreateFriendMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createFriendMessage"),
      handler: "createFriendMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const createGroupMessageHandler = new Lambda.Function(this, `CreateGroupMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createGroupMessage"),
      handler: "createGroupMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const createMeetingMessageHandler = new Lambda.Function(this, `CreateMeetingMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createMeetingMessage"),
      handler: "createMeetingMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessageHandler = new Lambda.Function(this, `GetMessage_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessage"),
      handler: "getMessage.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
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
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessagesByGroupIdHandler = new Lambda.Function(this, `GetMessagesByGroupId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessagesByGroupId"),
      handler: "getMessagesByGroupId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getMessagesByMeetingIdHandler = new Lambda.Function(this, `GetMessagesByMeetingId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getMessagesByMeetingId"),
      handler: "getMessagesByMeetingId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
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
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, messageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
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
        authorizationScopes: [ "yac/user.read" ],
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByTeamIdHandler,
        authorizationScopes: [ "yac/team_member.read" ],
      },
      {
        path: "/groups/{groupId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByGroupIdHandler,
        authorizationScopes: [ "yac/group_member.read" ],
      },
      {
        path: "/meetings/{meetingId}/users",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUsersByMeetingIdHandler,
        authorizationScopes: [ "yac/meeting_member.read" ],
      },
      {
        path: "/users/{userId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getUserImageUploadUrlHandler,
        authorizationScopes: [ "yac/user.write" ],
      },
    ];

    const teamRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/teams",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createTeamHandler,
        authorizationScopes: [ "yac/team.write" ],
      },
      {
        path: "/teams/{teamId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamHandler,
        authorizationScopes: [ "yac/team.read" ],
      },
      {
        path: "/users/{userId}/teams",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamsByUserIdHandler,
        authorizationScopes: [ "yac/team.read" ],
      },
      {
        path: "/teams/{teamId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToTeamHandler,
        authorizationScopes: [ "yac/team_member.write" ],
      },
      {
        path: "/teams/{teamId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromTeamHandler,
        authorizationScopes: [ "yac/team_member.delete" ],
      },
      {
        path: "/teams/{teamId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getTeamImageUploadUrlHandler,
        authorizationScopes: [ "yac/team.write" ],
      },
    ];

    const friendRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/friends",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersAsFriendsHandler,
        authorizationScopes: [ "yac/friend.write" ],
      },
      {
        path: "/users/{userId}/friends",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getFriendsByUserIdHandler,
        authorizationScopes: [ "yac/friend.read" ],
      },
      {
        path: "/users/{userId}/friends/{friendId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserAsFriendHandler,
        authorizationScopes: [ "yac/friend.delete" ],
      },
    ];

    const groupRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/groups",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createGroupHandler,
        authorizationScopes: [ "yac/group.write" ],
      },
      {
        path: "/groups/{groupId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupHandler,
        authorizationScopes: [ "yac/group.read" ],
      },
      {
        path: "/users/{userId}/groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupsByUserIdHandler,
        authorizationScopes: [ "yac/group.read" ],
      },
      {
        path: "/teams/{teamId}/groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupsByTeamIdHandler,
        authorizationScopes: [ "yac/group.read" ],
      },
      {
        path: "/groups/{groupId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToGroupHandler,
        authorizationScopes: [ "yac/group_member.write" ],
      },
      {
        path: "/groups/{groupId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromGroupHandler,
        authorizationScopes: [ "yac/group_member.delete" ],
      },
      {
        path: "/groups/{groupId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getGroupImageUploadUrlHandler,
        authorizationScopes: [ "yac/group.write" ],
      },
    ];

    const meetingRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/meetings",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createMeetingHandler,
        authorizationScopes: [ "yac/meeting.write" ],
      },
      {
        path: "/meetings/{meetingId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingHandler,
        authorizationScopes: [ "yac/meeting.read" ],
      },
      {
        path: "/meetings/{meetingId}/users",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersToMeetingHandler,
        authorizationScopes: [ "yac/meeting_member.write" ],
      },
      {
        path: "/meetings/{meetingId}/users/{userId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserFromMeetingHandler,
        authorizationScopes: [ "yac/meeting_member.delete" ],
      },
      {
        path: "/users/{userId}/meetings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingsByUserIdHandler,
        authorizationScopes: [ "yac/meeting.read" ],
      },
      {
        path: "/teams/{teamId}/meetings",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingsByTeamIdHandler,
        authorizationScopes: [ "yac/meeting.read" ],
      },
      {
        path: "/meetings/{meetingId}/image-upload-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMeetingImageUploadUrlHandler,
        authorizationScopes: [ "yac/meeting.write" ],
      },
    ];

    const messageRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/friends/{friendId}/messages",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createFriendMessageHandler,
        authorizationScopes: [ "yac/message.write" ],
      },
      {
        path: "/users/{userId}/friends/{friendId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByUserAndFriendIdsHandler,
        authorizationScopes: [ "yac/message.read" ],
      },
      {
        path: "/groups/{groupId}/messages",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createGroupMessageHandler,
        authorizationScopes: [ "yac/message.write" ],
      },
      {
        path: "/groups/{groupId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByGroupIdHandler,
        authorizationScopes: [ "yac/message.read" ],
      },
      {
        path: "/meetings/{meetingId}/messages",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createMeetingMessageHandler,
        authorizationScopes: [ "yac/message.write" ],
      },
      {
        path: "/meetings/{meetingId}/messages",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessagesByMeetingIdHandler,
        authorizationScopes: [ "yac/message.read" ],
      },

      {
        path: "/messages/{messageId}",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getMessageHandler,
        authorizationScopes: [ "yac/message.read" ],
      },
      {
        path: "/users/{userId}/messages/{messageId}",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateMessageByUserIdHandler,
        authorizationScopes: [ "yac/message.write" ],
      },
      {
        path: "/users/{userId}/friends/{friendId}/messages",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateFriendMessagesByUserIdHandler,
        authorizationScopes: [ "yac/message.write" ],
      },
      {
        path: "/users/{userId}/groups/{groupId}/messages",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateGroupMessagesByUserIdHandler,
        authorizationScopes: [ "yac/message.write" ],
      },
      {
        path: "/users/{userId}/meetings/{meetingId}/messages",
        method: ApiGatewayV2.HttpMethod.PATCH,
        handler: updateMeetingMessagesByUserIdHandler,
        authorizationScopes: [ "yac/message.write" ],
      },
    ];

    const conversationRoutes: RouteProps[] = [
      {
        path: "/users/{userId}/conversations",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getConversationsByUserIdHandler,
        authorizationScopes: [ "yac/conversation.read" ],
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
