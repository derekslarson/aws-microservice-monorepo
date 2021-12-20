import { OrganizationId } from "../../types/organizationId.type";
import { BillingPlan } from "../../enums/billingPlan.enum";

export type BillingPlanUpdatedSnsMessage = {
  organizationId: OrganizationId;
  billingPlan: BillingPlan;
};
