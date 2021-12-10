import { EnvConfigInterface as BaseEnvConfigInterface } from "@yac/util";

export const envConfig: EnvConfigInterface = {
  logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 2,
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || "",
    freePlanProductId: process.env.STRIPE_FREE_PLAN_PRODUCT_ID || "",
    paidPlanProductId: process.env.STRIPE_PAID_PLAN_PRODUCT_ID || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  tableNames: { billing: process.env.BILLING_TABLE_NAME || "" },
  bucketNames: {},
  snsTopicArns: {
    organizationCreated: process.env.ORGANIZATION_CREATED_SNS_TOPIC_ARN || "",
    userAddedToOrganization: process.env.USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN || "",
    userRemovedFromOrganization: process.env.USER_REMOVED_FROM_ORGANIZATION_SNS_TOPIC_ARN || "",
    billingPlanUpdated: process.env.BILLING_PLAN_UPDATED_SNS_TOPIC_ARN || "",
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
    userRemovedFromOrganization: string;
    billingPlanUpdated: string;
  };
  stripe: {
    apiKey: string;
    freePlanProductId: string;
    paidPlanProductId: string;
    webhookSecret: string;
  };
  tableNames: {
    billing: string;
  };
  globalSecondaryIndexNames: {
    one: string;
    two: string;
  };
}
