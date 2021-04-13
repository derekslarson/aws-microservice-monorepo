import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/core";

export const envConfig: EnvConfigInterface = {
  secret: process.env.SECRET || "",
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  tableNames: { IMAGES: process.env.IMAGES_DYNAMO_TABLE_NAME || "" },
  yacApiUrl: process.env.YAC_API_URL || "",
  dynamoRegion: process.env.DYNAMO_REGION || "",
};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  dynamoRegion: string,
  tableNames: {
    IMAGES: string
  }
  yacApiUrl: string,
}
