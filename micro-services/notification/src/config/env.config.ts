import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  jwksUrl: process.env.JWKS_URL || "",
  webSocketApiEndpoint: process.env.WEBSOCKET_API_ENDPOINT || "",
  tableNames: { listenerMapping: process.env.NOTIFICATION_MAPPING_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: { userAddedToTeam: process.env.USER_ADDED_TO_TEAM_SNS_TOPIC_ARN || "" },
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
  }
  bucketNames: Record<string, string>;
  globalSecondaryIndexNames: {
    one: string;
  }
}
