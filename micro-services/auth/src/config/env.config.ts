import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  jwksUri: process.env.JWKS_URI || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  apiDomain: process.env.API_DOMAIN || "",
  apiUrl: process.env.API_URL || "",
  bucketNames: {},
  tableNames: { auth: process.env.AUTH_TABLE_NAME || "" },
  globalSecondaryIndexNames: { one: process.env.GSI_ONE_INDEX_NAME || "" },
  snsTopicArns: {},
  mailSender: process.env.MAIL_SENDER || "",
  authUI: process.env.YAC_AUTH_UI || "",
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  jwksUri: string;
  apiDomain: string;
  apiUrl: string;
  mailSender: string;
  authUI: string;
  tableNames: {
    auth: string;
  };
  globalSecondaryIndexNames: {
    one: string;
  }
}
