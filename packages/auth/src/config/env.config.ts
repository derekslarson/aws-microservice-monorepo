import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util/src/config/env.config";

export const envConfig: EnvConfigInterface = {
  jwksUri: process.env.JWKS_URI || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  apiUrl: process.env.API_URL || "",
  bucketNames: {},
  tableNames: { auth: process.env.AUTH_TABLE_NAME || "" },
  globalSecondaryIndexNames: { one: process.env.GSI_ONE_INDEX_NAME || "" },
  snsTopicArns: {
    userCreated: process.env.USER_CREATED_SNS_TOPIC_ARN || "",
    createUserRequest: process.env.CREATE_USER_REQUEST_SNS_TOPIC_ARN || "",
  },
  mailSender: process.env.MAIL_SENDER || "",
  authUI: process.env.YAC_AUTH_UI || "",
  googleClient: {
    id: process.env.GOOGLE_CLIENT_ID || "",
    secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_CLIENT_REDIRECT_URI || "",
  },
  slackClient: {
    id: process.env.SLACK_CLIENT_ID || "",
    secret: process.env.SLACK_CLIENT_SECRET || "",
    redirectUri: process.env.SLACK_CLIENT_REDIRECT_URI || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  jwksUri: string;
  apiUrl: string;
  mailSender: string;
  authUI: string;
  tableNames: {
    auth: string;
  };
  snsTopicArns: {
    userCreated: string;
    createUserRequest: string;
  }
  globalSecondaryIndexNames: {
    one: string;
  };
  googleClient: {
    id: string;
    secret: string;
    redirectUri: string;
  };
  slackClient: {
    id: string;
    secret: string;
    redirectUri: string;
  }
}
