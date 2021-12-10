import { OrganizationId } from "../../types/organizationId.type";
import { BillingPlan } from "../../enums";

export type BillingPlanUpdatedSnsMessage = {
  organizationId: OrganizationId;
  billingPlan: BillingPlan;
};
