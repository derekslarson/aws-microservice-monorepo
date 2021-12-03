import { inject, injectable } from "inversify";
import { LoggerServiceInterface, OrganizationId } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { OrganizationStripeMappingRepositoryInterface } from "../../repositories/organizationStripeMapping.dynamo.repository";
import { Stripe, StripeFactory } from "../../factories/stripe.factory";
import { EnvConfigInterface } from "../../config/env.config";

@injectable()
export class BillingService implements BillingServiceInterface {
  private stripe: Stripe;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationStripeMappingRepositoryInterface) private organizationStripeMappingRepository: OrganizationStripeMappingRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) config: BillingServiceConfig,
    @inject(TYPES.StripeFactory) stripeFactory: StripeFactory,
  ) {
    this.stripe = stripeFactory(config.stripe.apiKey);
  }

  public async getBillingPortalUrl(params: GetBillingPortalUrlInput): Promise<GetBillingPortalUrlOutput> {
    try {
      this.loggerService.trace("getBillingPortalUrl called", { params }, this.constructor.name);

      const { organizationId } = params;

      const { organizationStripeMapping } = await this.organizationStripeMappingRepository.getOrganizationStripeMapping({ organizationId });

      const { url: billingPortalUrl } = await this.stripe.billingPortal.sessions.create({ customer: organizationStripeMapping.customerId });

      return { billingPortalUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getBillingPortalUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface BillingServiceInterface {
  getBillingPortalUrl(params: GetBillingPortalUrlInput): Promise<GetBillingPortalUrlOutput>
}

type BillingServiceConfig = Pick<EnvConfigInterface, "stripe">;

export interface GetBillingPortalUrlInput {
  organizationId: OrganizationId;
}

export interface GetBillingPortalUrlOutput {
  billingPortalUrl: string;
}
