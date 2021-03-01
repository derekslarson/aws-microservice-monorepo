import { LogLevel } from "../enums/logLevel.enum";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: [],
};

export interface EnvConfigInterface {
  secret: string;
  logLevel: LogLevel;
  tableNames: string[];
}
