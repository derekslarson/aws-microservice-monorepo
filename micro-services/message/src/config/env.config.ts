import { EnvConfigInterface as BaseEnvConfigInterface, LogLevel } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL as unknown as LogLevel,
  secret: process.env.SECRET as string,
  bucketNames: { messages: process.env.MESSAGES_S3_BUCKET as string },
  fileSystemPath: process.env.EFS_MOUNTED_PATH as string,
};

export interface EnvConfigInterface extends Omit<BaseEnvConfigInterface, "tableNames" | "snsTopicArns"> {
  fileSystemPath: string
}
