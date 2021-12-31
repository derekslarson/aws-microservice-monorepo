import { LogLevel } from "../enums/logLevel.enum";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: {},
  bucketNames: { message: process.env.MESSAGE_S3_BUCKET_NAME || "" },
  snsTopicArns: {
    clientsUpdated: process.env.CLIENTS_UPDATED_SNS_TOPIC_ARN || "",
    userCreated: process.env.USER_CREATED_SNS_TOPIC_ARN || "",
  },
};

export interface EnvConfigInterface {
  logLevel: LogLevel;
  tableNames: Record<string, string>;
  bucketNames: Record<string, string>;
  snsTopicArns: Record<string, string>;
}
