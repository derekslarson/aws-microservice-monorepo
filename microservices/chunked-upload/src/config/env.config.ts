import { EnvConfigInterface as BaseEnvConfigInterface, LogLevel } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL as unknown as LogLevel,
  bucketNames: { rawMessage: process.env.RAW_MESSAGE_S3_BUCKET_NAME as string },
  fileSystemPath: process.env.EFS_MOUNTED_PATH as string,
  messageUploadTokenSecretId: process.env.MESSAGE_UPLOAD_TOKEN_SECRET_ID || "",
};

export interface EnvConfigInterface extends Omit<BaseEnvConfigInterface, "tableNames" | "snsTopicArns"> {
  fileSystemPath: string;
  messageUploadTokenSecretId: string;
}
