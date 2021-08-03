import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  jwksUrl: process.env.JWKS_URL || "",
  tableNames: {
    notificationMapping: process.env.NOTIFICATION_MAPPING_TABLE_NAME || "",
    core: process.env.CORE_TABLE_NAME || "",
  },
  bucketNames: {
    message: process.env.MESSAGE_S3_BUCKET_NAME || "",
    image: process.env.IMAGE_S3_BUCKET_NAME || "",
  },
  snsTopicArns: { userCreated: process.env.USER_CREATED_SNS_TOPIC_ARN || "" },
  globalSecondaryIndexNames: {
    one: process.env.GSI_ONE_INDEX_NAME || "",
    two: process.env.GSI_TWO_INDEX_NAME || "",
    three: process.env.GSI_THREE_INDEX_NAME || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  jwksUrl: string;
  tableNames: {
    core: string;
    notificationMapping?: string;
  };
  bucketNames: {
    message: string;
    image: string;
  };
  globalSecondaryIndexNames: {
    one: string;
    two: string;
    three: string;
  }
}
