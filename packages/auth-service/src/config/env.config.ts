import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/core";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  apiDomain: process.env.API_DOMAIN || "",
  tableNames: { clientsTableName: process.env.CLIENTS_TABLE_NAME || "" },
  mailSender: process.env.MAIL_SENDER || "",
  userPool: {
    id: process.env.USER_POOL_ID || "",
    domain: process.env.USER_POOL_DOMAIN || "",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  apiDomain: string;
  mailSender: string;
  tableNames: {
    clientsTableName: string;
  };
  userPool: {
    id: string;
    domain: string;
  };
}
