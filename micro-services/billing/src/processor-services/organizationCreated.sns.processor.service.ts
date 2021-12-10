import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BillingPlan, LoggerServiceInterface, OrganizationCreatedSnsMessage, SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { OrganizationStripeMapping, OrganizationStripeMappingRepositoryInterface } from "../repositories/organizationStripeMapping.dynamo.repository";
import { BillingServiceInterface } from "../services/tier-1/billing.service";

@injectable()
export class OrganizationCreatedSnsProcessorService implements SnsProcessorServiceInterface {
  private organizationCreatedSnsTopciArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationStripeMappingRepositoryInterface) private organizationStripeMappingRepository: OrganizationStripeMappingRepositoryInterface,
    @inject(TYPES.BillingServiceInterface) private billingService: BillingServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToOrganizationSnsProcessorServiceConfigInterface,
  ) {
    this.organizationCreatedSnsTopciArn = envConfig.snsTopicArns.organizationCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.organizationCreatedSnsTopciArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<OrganizationCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { organization, createdByUser } } = record;

      const { customer } = await this.billingService.createCustomer({ name: organization.name, email: createdByUser.email, phone: createdByUser.name });

      const { subscription } = await this.billingService.createFreePlanSubscription({ customerId: customer.id });

      const subscriptionItem = subscription.items.data[0];

      if (!subscriptionItem) {
        throw new Error("subscription item not returned from stripe");
      }

      const organizationStripeMapping: Omit<OrganizationStripeMapping, "subscriptionItemQuantity"> = {
        organizationId: organization.id,
        customerId: customer.id,
        subscriptionItemId: subscriptionItem.id,
        plan: BillingPlan.Free,
      };

      await this.organizationStripeMappingRepository.createOrganizationStripeMapping({ organizationStripeMapping });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToOrganizationSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "organizationCreated">;
}
