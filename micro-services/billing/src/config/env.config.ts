import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || "",
    freePlanPriceId: process.env.STRIPE_FREE_PLAN_PRICE_ID || "",
    paidPlanProductId: process.env.STRIPE_PAID_PLAN_PRODUCT_ID || "",
  },
  tableNames: { billing: process.env.BILLING_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: {
    organizationCreated: process.env.ORGANIZATION_CREATED_SNS_TOPIC_ARN || "",
    userAddedToOrganization: process.env.USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN || "",
  },
  globalSecondaryIndexNames: {
    one: process.env.GSI_ONE_INDEX_NAME || "",
    two: process.env.GSI_TWO_INDEX_NAME || "",
  },

};

export interface EnvConfigInterface extends BaseEnvConfigInterface {
  snsTopicArns: {
    organizationCreated: string;
    userAddedToOrganization: string;
  };
  stripe: {
    apiKey: string;
    freePlanPriceId: string;
    paidPlanProductId: string;
  };
  tableNames: {
    billing: string;
  };
  globalSecondaryIndexNames: {
    one: string;
    two: string;
  };
}
