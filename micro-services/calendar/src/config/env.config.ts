import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { calendar: process.env.CALENDAR_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: {},
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  tableNames: {
    calendar: string;
  };
}
