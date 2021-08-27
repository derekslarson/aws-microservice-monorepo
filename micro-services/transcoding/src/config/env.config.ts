import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  audoAiApiDomain: process.env.AUDO_AI_API_DOMAIN || "",
  audoAiApiKey: process.env.AUDO_AI_API_KEY || "",
  tableNames: {},
  bucketNames: {
    rawMessage: process.env.RAW_MESSAGE_S3_BUCKET_NAME || "",
    enhancedMessage: process.env.ENHANCED_MESSAGE_S3_BUCKET_NAME || "",
  },
  snsTopicArns: { messageTranscoded: process.env.MESSAGE_TRANSCODED_SNS_TOPIC_ARN || "" },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  audoAiApiDomain: string;
  audoAiApiKey: string;
  tableNames: Record<string, never>;
  snsTopicArns: {
    messageTranscoded: string;
  };
  bucketNames: {
    rawMessage: string;
    enhancedMessage: string;
  };
}
