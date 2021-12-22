import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util/src/config/env.config";

export const envConfig: EnvConfigInterface = {
  environment: process.env.ENVIRONMENT || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: {},
  bucketNames: {
    message: process.env.MESSAGE_S3_BUCKET_NAME || "",
    transcription: process.env.TRANSCRIPTION_S3_BUCKET_NAME || "",
  },
  snsTopicArns: {
    messageTranscoded: process.env.MESSAGE_TRANSCODED_SNS_TOPIC_ARN || "",
    messageTranscribed: process.env.MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN || "",
    transcriptionJobCompleted: process.env.TRANSCRIPTION_JOB_COMPLETED_SNS_TOPIC_ARN || "",
    transcriptionJobFailed: process.env.TRANSCRIPTION_JOB_FAILED_SNS_TOPIC_ARN || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  environment: string,
  tableNames: Record<string, never>;
  snsTopicArns: {
    messageTranscoded: string;
    messageTranscribed: string;
    transcriptionJobCompleted: string;
    transcriptionJobFailed: string;
  };
  bucketNames: {
    message: string;
    transcription: string;
  };
}
