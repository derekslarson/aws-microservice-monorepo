import { LogLevel } from "../enums/logLevel.enum";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  groupsTableName: process.env.GROUPS_TABLE_NAME || "",
  secret: process.env.SECRET || "",
};

export interface EnvConfigInterface {
  logLevel: LogLevel;
  groupsTableName: string;
  secret: string;
}
