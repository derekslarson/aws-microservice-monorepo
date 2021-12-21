import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import StripeNamespace from "stripe";
import { BadRequestError } from "@yac/util/src/errors/badRequest.error";
import { BillingPlan } from "@yac/util/src/enums/billingPlan.enum";
import { TYPES } from "../../inversion-of-control/types";
import { OrganizationStripeMappingRepositoryInterface } from "../../repositories/organizationStripeMapping.dynamo.repository";
import { Stripe, StripeFactory } from "../../factories/stripe.factory";
import { EnvConfigInterface } from "../../config/env.config";

@injectable()
export class BillingService implements BillingServiceInterface {
  private stripe: Stripe;

  private freePlanProductId: string;

  private paidPlanProductId: string;

  private webhookSecret: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationStripeMappingRepositoryInterface) private organizationStripeMappingRepository: OrganizationStripeMappingRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) config: BillingServiceConfig,
    @inject(TYPES.StripeFactory) stripeFactory: StripeFactory,
  ) {
    this.stripe = stripeFactory(config.stripe.apiKey);
    this.freePlanProductId = config.stripe.freePlanProductId;
    this.paidPlanProductId = config.stripe.paidPlanProductId;
    this.webhookSecret = config.stripe.webhookSecret;
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

  public async createCustomer(params: CreateCustomerInput): Promise<CreateCustomerOutput> {
    try {
      this.loggerService.trace("createCustomer called", { params }, this.constructor.name);

      const { name, email, phone } = params;

      const customer = await this.stripe.customers.create({ name, email, phone });

      return { customer };
    } catch (error: unknown) {
      this.loggerService.error("Error in createCustomer", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createFreePlanSubscription(params: CreateFreePlanSubscriptionInput): Promise<CreateFreePlanSubscriptionOutput> {
    try {
      this.loggerService.trace("createFreePlanSubscription called", { params }, this.constructor.name);

      const { customerId } = params;

      const { data: [ freePlanPrice ] } = await this.stripe.prices.list({ product: this.freePlanProductId });

      if (!freePlanPrice) {
        throw new Error("free plan price not found");
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        proration_behavior: "always_invoice",
        items: [ { price: freePlanPrice.id, quantity: 1 } ],
      });

      return { subscription };
    } catch (error: unknown) {
      this.loggerService.error("Error in createFreePlanSubscription", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateSubscriptionItemQuantity(params: UpdateSubscriptionItemQuantityInput): Promise<UpdateSubscriptionItemQuantityOutput> {
    try {
      this.loggerService.trace("updateSubscriptionItemQuantity called", { params }, this.constructor.name);

      const { subscriptionItemId, quantity } = params;

      await this.stripe.subscriptionItems.update(subscriptionItemId, { quantity });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateSubscriptionItemQuantity", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async handleStripeWebhook(params: HandleStripeWebhookInput): Promise<HandleStripeWebhookOutput> {
    try {
      this.loggerService.trace("handleStripeWebhook called", { params }, this.constructor.name);

      const { body, stripeSignature } = params;

      const webhookEvent = this.stripe.webhooks.constructEvent(body, stripeSignature, this.webhookSecret);

      const { customer: customerId, items: { data: subscriptionItems } } = webhookEvent.data.object as StripeNamespace.Subscription;

      if (typeof customerId !== "string") {
        throw new BadRequestError("Malformed event from stripe. customerId value not string");
      }

      const { organizationStripeMapping } = await this.organizationStripeMappingRepository.getOrganizationStripeMappingByCustomerId({ customerId });

      const subscriptionItem = subscriptionItems.find((item) => item.id === organizationStripeMapping.subscriptionItemId);

      if (!subscriptionItem) {
        throw new BadRequestError("Malformed event from stripe. subscriptionItem missing");
      }

      if (organizationStripeMapping.productId !== subscriptionItem.price.product) {
        const newPlan = subscriptionItem.price.product === this.paidPlanProductId ? BillingPlan.Paid : BillingPlan.Free;

        await this.organizationStripeMappingRepository.updateOrganizationStripeMapping({ organizationId: organizationStripeMapping.organizationId, updates: { plan: newPlan } });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in handleStripeWebhook", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface BillingServiceInterface {
  getBillingPortalUrl(params: GetBillingPortalUrlInput): Promise<GetBillingPortalUrlOutput>;
  createCustomer(params: CreateCustomerInput): Promise<CreateCustomerOutput>;
  createFreePlanSubscription(params: CreateFreePlanSubscriptionInput): Promise<CreateFreePlanSubscriptionOutput>;
  updateSubscriptionItemQuantity(params: UpdateSubscriptionItemQuantityInput): Promise<UpdateSubscriptionItemQuantityOutput>
  handleStripeWebhook(params: HandleStripeWebhookInput): Promise<HandleStripeWebhookOutput>
}

type BillingServiceConfig = Pick<EnvConfigInterface, "stripe">;

export interface GetBillingPortalUrlInput {
  organizationId: OrganizationId;
}

export interface GetBillingPortalUrlOutput {
  billingPortalUrl: string;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
}

export interface CreateCustomerOutput {
  customer: StripeNamespace.Customer;
}

export interface CreateFreePlanSubscriptionInput {
  customerId: string;
}

export interface CreateFreePlanSubscriptionOutput {
  subscription: StripeNamespace.Subscription;
}

export interface UpdateSubscriptionItemQuantityInput {
  subscriptionItemId: string;
  quantity: number;
}

export type UpdateSubscriptionItemQuantityOutput = void;

export interface HandleStripeWebhookInput {
  body: string;
  stripeSignature: string;
}

export type HandleStripeWebhookOutput = void;
