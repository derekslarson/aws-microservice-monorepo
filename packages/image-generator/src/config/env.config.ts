import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util/src/config/env.config";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { IMAGES: process.env.IMAGES_DYNAMO_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: {},
  yacApiUrl: process.env.YAC_API_URL || "",
  origin: `https://${process.env.ORIGIN || ""}`,
  bannerbear_key: "NZ94Ck1QiPrqtbUIItWUQQtt",
  bannerbear_webhook_key: "xma6dUGorbiriFkQQ3orugtt",
  bannerbear_templates: {
    GIF2VIDEO: "wXmzGBDajKNbLN7gjn",
    IMAGE: "N1qMxz5vvgq5eQ4kor",
  },
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  origin: string,
  bannerbear_key: string,
  bannerbear_webhook_key: string,
  bannerbear_templates: {
    GIF2VIDEO: string,
    IMAGE: string,
  },
  tableNames: {
    IMAGES: string
  }
  yacApiUrl: string,
}
