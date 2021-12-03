import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  stripe: { apiKey: process.env.STRIPE_API_KEY || "" },
  tableNames: { billing: process.env.BILLING_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: {},
  globalSecondaryIndexNames: { one: process.env.GSI_ONE_INDEX_NAME || "" },

};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  stripe: {
    apiKey: string;
  };
  tableNames: {
    billing: string;
  };
  globalSecondaryIndexNames: {
    one: string;
  };
}
