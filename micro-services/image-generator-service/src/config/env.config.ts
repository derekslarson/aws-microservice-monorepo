import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/core";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { IMAGES: process.env.IMAGES_DYNAMO_TABLE_NAME || "" },
  yacApiUrl: process.env.YAC_API_URL || "",
  dynamoRegion: process.env.DYNAMO_REGION || "",
  origin: `https://${process.env.ORIGIN || ""}`,
  bannerbear_key: "NZ94Ck1QiPrqtbUIItWUQQtt",
  bannerbear_webhook_key: "xma6dUGorbiriFkQQ3orugtt",
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  dynamoRegion: string,
  origin: string,
  bannerbear_key: string,
  bannerbear_webhook_key: string,
  tableNames: {
    IMAGES: string
  }
  yacApiUrl: string,
}
