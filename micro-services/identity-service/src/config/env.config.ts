import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/core";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: {},
  userPoolClientId: process.env.USER_POOL_CLIENT_ID || "",
  userPoolClientSecret: process.env.USER_POOL_CLIENT_SECRET || "",
  userPoolClientRedirectUri: process.env.USER_POOL_CLIENT_REDIRECT_URI || "",
  authServiceDomain: process.env.AUTH_SERVICE_DOMAIN || "",
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  userPoolClientId: string;
  userPoolClientSecret: string;
  userPoolClientRedirectUri: string;
  authServiceDomain: string;
}

// token change
