import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  jwksUrl: process.env.JWKS_URL || "",
  webSocketApiEndpoint: process.env.WEBSOCKET_API_ENDPOINT || "",
  tableNames: { listenerMapping: process.env.NOTIFICATION_MAPPING_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: {
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
    messageCreated: process.env.MESSAGE_CREATED_SNS_TOPIC_ARN || "",
    messageUpdated: process.env.MESSAGE_UPDATED_SNS_TOPIC_ARN || "",
  },
  platformApplicationArn: process.env.PLATFORM_APPLICATION_ARN || "",
  globalSecondaryIndexNames: { one: process.env.GSI_ONE_INDEX_NAME || "" },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  jwksUrl: string;
  webSocketApiEndpoint: string;
  tableNames: {
    listenerMapping?: string;
  };
  snsTopicArns: {
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
    messageCreated: string;
    messageUpdated: string;
  };
  platformApplicationArn: string;
  bucketNames: Record<string, string>;
  globalSecondaryIndexNames: {
    one: string;
  }
}
