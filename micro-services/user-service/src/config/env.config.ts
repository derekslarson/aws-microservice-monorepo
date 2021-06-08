import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/core";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { users: process.env.USERS_DYNAMO_TABLE_NAME || "" },
  snsTopicArns: { userSignedUp: process.env.USER_SIGNED_UP_SNS_TOPIC_ARN || "" },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  tableNames: {
    users: string
  }
}
