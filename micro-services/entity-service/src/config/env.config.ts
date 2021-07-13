import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/core";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { core: process.env.CORE_TABLE_NAME || "" },
  snsTopicArns: { userSignedUp: process.env.USER_SIGNED_UP_SNS_TOPIC_ARN || "" },
  globalSecondaryIndexNames: {
    one: process.env.GSI_ONE_INDEX_NAME || "",
    two: process.env.GSI_TWO_INDEX_NAME || "",
    three: process.env.GSI_THREE_INDEX_NAME || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  tableNames: {
    core: string;
  };
  globalSecondaryIndexNames: {
    one: string;
    two: string;
    three: string;
  }
}
