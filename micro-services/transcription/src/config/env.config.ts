import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  audoAiApiDomain: process.env.AUDO_AI_API_DOMAIN || "",
  audoAiApiKey: process.env.AUDO_AI_API_KEY || "",
  tableNames: {},
  bucketNames: {
    message: process.env.MESSAGE_S3_BUCKET_NAME || "",
    transcription: process.env.TRANSCRIPTION_S3_BUCKET_NAME || "",
  },
  snsTopicArns: {
    messageTranscoded: process.env.MESSAGE_TRANSCODED_SNS_TOPIC_ARN || "",
    messageTranscribed: process.env.MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  audoAiApiDomain: string;
  audoAiApiKey: string;
  tableNames: Record<string, never>;
  snsTopicArns: {
    messageTranscoded: string;
    messageTranscribed: string
  };
  bucketNames: {
    message: string;
    transcription: string;
  };
}
