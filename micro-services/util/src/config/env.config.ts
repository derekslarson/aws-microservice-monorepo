import { LogLevel } from "../enums/logLevel.enum";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: {},
  bucketNames: { message: process.env.MESSAGE_S3_BUCKET_NAME || "" },
  snsTopicArns: {
    clientsUpdated: process.env.CLIENTS_UPDATED_SNS_TOPIC_ARN || "",
    userCreated: process.env.USER_CREATED_SNS_TOPIC_ARN || "",
  },
};

export interface EnvConfigInterface {
  secret: string;
  logLevel: LogLevel;
  tableNames: Record<string, string>;
  bucketNames: {
    message?: string;
  };
  snsTopicArns: {
    clientsUpdated?: string;
    userCreated?: string;
  };
}
