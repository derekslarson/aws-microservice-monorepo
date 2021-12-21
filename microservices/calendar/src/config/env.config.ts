import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util/src/config/env.config";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { calendar: process.env.CALENDAR_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: {},
  googleClient: {
    id: process.env.GOOGLE_CLIENT_ID || "",
    secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_CLIENT_REDIRECT_URI || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  tableNames: {
    calendar: string;
  };
  googleClient: {
    id: string;
    secret: string;
    redirectUri: string;
  }
}
