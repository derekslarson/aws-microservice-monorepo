import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { core: process.env.CORE_TABLE_NAME || "" },
  bucketNames: {
    rawMessage: process.env.RAW_MESSAGE_S3_BUCKET_NAME || "",
    enhancedMessage: process.env.ENHANCED_MESSAGE_S3_BUCKET_NAME || "",
    image: process.env.IMAGE_S3_BUCKET_NAME || "",
  },
  snsTopicArns: {
    userCreated: process.env.USER_CREATED_SNS_TOPIC_ARN || "",
    userAddedToTeam: process.env.USER_ADDED_TO_TEAM_SNS_TOPIC_ARN || "",
    userRemovedFromTeam: process.env.USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN || "",
    userAddedToGroup: process.env.USER_ADDED_TO_GROUP_SNS_TOPIC_ARN || "",
    userRemovedFromGroup: process.env.USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN || "",
    userAddedToMeeting: process.env.USER_ADDED_TO_MEETING_SNS_TOPIC_ARN || "",
    userRemovedFromMeeting: process.env.USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN || "",
    userAddedAsFriend: process.env.USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN || "",
    userRemovedAsFriend: process.env.USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN || "",
    teamCreated: process.env.TEAM_CREATED_SNS_TOPIC_ARN || "",
    meetingCreated: process.env.MEETING_CREATED_SNS_TOPIC_ARN || "",
    groupCreated: process.env.GROUP_CREATED_SNS_TOPIC_ARN || "",
    friendMessageCreated: process.env.FRIEND_MESSAGE_CREATED_SNS_TOPIC_ARN || "",
    friendMessageUpdated: process.env.FRIEND_MESSAGE_UPDATED_SNS_TOPIC_ARN || "",
    groupMessageCreated: process.env.GROUP_MESSAGE_CREATED_SNS_TOPIC_ARN || "",
    groupMessageUpdated: process.env.GROUP_MESSAGE_UPDATED_SNS_TOPIC_ARN || "",
    meetingMessageCreated: process.env.MEETING_MESSAGE_CREATED_SNS_TOPIC_ARN || "",
    meetingMessageUpdated: process.env.MEETING_MESSAGE_UPDATED_SNS_TOPIC_ARN || "",
    messageTranscoded: process.env.MESSAGE_TRANSCODED_SNS_TOPIC_ARN || "",
    messageTranscribed: process.env.MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN || "",
  },
  globalSecondaryIndexNames: {
    one: process.env.GSI_ONE_INDEX_NAME || "",
    two: process.env.GSI_TWO_INDEX_NAME || "",
    three: process.env.GSI_THREE_INDEX_NAME || "",
  },
  openSearchDomainEndpoint: process.env.OPEN_SEARCH_DOMAIN_ENDPOINT || "",
  messageUploadTokenSecretId: process.env.MESSAGE_UPLOAD_TOKEN_SECRET_ID || "",
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  tableNames: {
    core: string;
  };
  snsTopicArns: {
    userCreated: string;
    userAddedToTeam: string;
    userRemovedFromTeam: string;
    userAddedToGroup: string;
    userRemovedFromGroup: string;
    userAddedToMeeting: string;
    userRemovedFromMeeting: string;
    userAddedAsFriend: string;
    userRemovedAsFriend: string;
    teamCreated: string;
    meetingCreated: string;
    groupCreated: string;
    friendMessageCreated: string;
    friendMessageUpdated: string;
    groupMessageCreated: string;
    groupMessageUpdated: string;
    meetingMessageCreated: string;
    meetingMessageUpdated: string;
    messageTranscoded: string;
    messageTranscribed: string;
  };
  bucketNames: {
    rawMessage: string;
    enhancedMessage: string;
    image: string;
  };
  globalSecondaryIndexNames: {
    one: string;
    two: string;
    three: string;
  };
  openSearchDomainEndpoint: string;
  messageUploadTokenSecretId: string;
}
