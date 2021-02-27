import { LogLevel } from "@yac/base/src/enums/logLevel.enum.enum";

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
    domain: process.env.USER_POOL_DOMAIN || "",
  },
};

export interface EnvConfigInterface {
  secret: string;
  logLevel: LogLevel;
  apiDomain: string;
  tableNames: string[];
  mailSender: string;
  userPool: {
    id: string;
    clientId: string;
    clientSecret: string;
    domain: string;
  }
}
