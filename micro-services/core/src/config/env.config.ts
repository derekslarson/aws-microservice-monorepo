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
    organizationCreated: process.env.ORGANIZATION_CREATED_SNS_TOPIC_ARN || "",
    teamCreated: process.env.TEAM_CREATED_SNS_TOPIC_ARN || "",
    groupCreated: process.env.GROUP_CREATED_SNS_TOPIC_ARN || "",
    meetingCreated: process.env.MEETING_CREATED_SNS_TOPIC_ARN || "",
    userAddedToOrganization: process.env.USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN || "",
    userAddedToTeam: process.env.USER_ADDED_TO_TEAM_SNS_TOPIC_ARN || "",
    userAddedToGroup: process.env.USER_ADDED_TO_GROUP_SNS_TOPIC_ARN || "",
    userAddedToMeeting: process.env.USER_ADDED_TO_MEETING_SNS_TOPIC_ARN || "",
    userAddedAsFriend: process.env.USER_ADDED_AS_FRIEND_SNS_TOPIC_ARN || "",
    userRemovedFromOrganization: process.env.USER_REMOVED_FROM_ORGANIZATION_SNS_TOPIC_ARN || "",
    userRemovedFromTeam: process.env.USER_REMOVED_FROM_TEAM_SNS_TOPIC_ARN || "",
    userRemovedFromGroup: process.env.USER_REMOVED_FROM_GROUP_SNS_TOPIC_ARN || "",
    userRemovedFromMeeting: process.env.USER_REMOVED_FROM_MEETING_SNS_TOPIC_ARN || "",
    userRemovedAsFriend: process.env.USER_REMOVED_AS_FRIEND_SNS_TOPIC_ARN || "",
    messageCreated: process.env.MESSAGE_CREATED_SNS_TOPIC_ARN || "",
    messageUpdated: process.env.MESSAGE_UPDATED_SNS_TOPIC_ARN || "",
    messageTranscoded: process.env.MESSAGE_TRANSCODED_SNS_TOPIC_ARN || "",
    messageTranscribed: process.env.MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN || "",
    createUserRequest: process.env.CREATE_USER_REQUEST_SNS_TOPIC_ARN || "",
    billingPlanUpdated: process.env.BILLING_PLAN_UPDATED_SNS_TOPIC_ARN || "",
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
    createUserRequest: string;
    billingPlanUpdated: string;
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
