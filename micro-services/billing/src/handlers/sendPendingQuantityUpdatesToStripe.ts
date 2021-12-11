import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { BillingServiceInterface } from "../services/tier-1/billing.service";
import { OrganizationStripeMappingRepositoryInterface } from "../repositories/organizationStripeMapping.dynamo.repository";

const billingService = container.get<BillingServiceInterface>(TYPES.BillingServiceInterface);
const organizationStripeMappingRepository = container.get<OrganizationStripeMappingRepositoryInterface>(TYPES.OrganizationStripeMappingRepositoryInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: unknown): Promise<void> => {
  try {
    loggerService.trace("sendPendingQuantityUpdatesToStripe called", { event }, "sendPendingQuantityUpdatesToStripe handler");

    const { organizationStripeMappings } = await organizationStripeMappingRepository.getOrganizationStripeMappingsWithPendingQuantityUpdates();

    await Promise.allSettled(organizationStripeMappings.map(async ({ organizationId, subscriptionItemId, subscriptionItemQuantity }) => {
      await billingService.updateSubscriptionItemQuantity({ subscriptionItemId, quantity: subscriptionItemQuantity });
      await organizationStripeMappingRepository.removePendingQuantityUpdateStatus({ organizationId });
    }));
  } catch (error: unknown) {
    loggerService.error("Error in sendPendingQuantityUpdatesToStripe handler", { error, event }, "sendPendingQuantityUpdatesToStripe handler");
  }
};
