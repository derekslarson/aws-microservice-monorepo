import { LogLevel, EnvConfigInterface as BaseEnvConfigInterface } from "@yac/core";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  apiDomain: process.env.API_DOMAIN || "",
  tableNames: [],
  mailSender: process.env.MAIL_SENDER || "",
  userPool: {
    id: process.env.USER_POOL_ID || "",
    clientId: process.env.USER_POOL_CLIENT_ID || "",
    clientSecret: process.env.USER_POOL_CLIENT_SECRET || "",
    clientRedirectUri: process.env.USER_POOL_CLIENT_REDIRECT_URI || "",
    domain: process.env.USER_POOL_DOMAIN || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  secret: string;
  logLevel: LogLevel;
  apiDomain: string;
  tableNames: string[];
  mailSender: string;
  userPool: {
    id: string;
    clientId: string;
    clientSecret: string;
    clientRedirectUri: string;
    domain: string;
  }
}
