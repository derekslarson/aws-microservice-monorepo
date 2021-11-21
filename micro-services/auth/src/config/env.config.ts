import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  jwksUri: process.env.JWKS_URI || "",
  authSecretId: process.env.AUTH_SECRET_ID || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  apiDomain: process.env.API_DOMAIN || "",
  bucketNames: {},
  tableNames: { auth: process.env.AUTH_TABLE_NAME || "" },
  globalSecondaryIndexNames: {
    one: process.env.GSI_ONE_INDEX_NAME || "",
    two: process.env.GSI_TWO_INDEX_NAME || "",
  },
  snsTopicArns: {
    userCreated: process.env.USER_CREATED_SNS_TOPIC_ARN || "",
    externalProviderUserSignedUp: process.env.EXTERNAL_PROVIDER_USER_SIGNED_UP_SNS_TOPIC_ARN || "",
  },
  mailSender: process.env.MAIL_SENDER || "",
  authUI: process.env.YAC_AUTH_UI || "",
  userPool: {
    id: process.env.USER_POOL_ID || "",
    domain: process.env.USER_POOL_DOMAIN || "",
    yacClientId: process.env.YAC_USER_POOL_CLIENT_ID || "",
    yacClientSecret: process.env.YAC_USER_POOL_CLIENT_SECRET || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  jwksUri: string;
  authSecretId: string;
  apiDomain: string;
  mailSender: string;
  authUI: string;
  tableNames: {
    auth: string;
  };
  globalSecondaryIndexNames: {
    one: string;
    two: string;
  }
  snsTopicArns: {
    userCreated: string;
    externalProviderUserSignedUp: string;
  }
  userPool: {
    id: string;
    domain: string;
    yacClientId: string;
    yacClientSecret: string;
  };
}
