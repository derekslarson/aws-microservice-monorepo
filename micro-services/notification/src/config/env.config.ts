import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
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
    teamCreated: process.env.TEAM_CREATED_SNS_TOPIC_ARN || "",
  },
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
    teamCreated: string;
  }
  bucketNames: Record<string, string>;
  globalSecondaryIndexNames: {
    one: string;
  }
}
