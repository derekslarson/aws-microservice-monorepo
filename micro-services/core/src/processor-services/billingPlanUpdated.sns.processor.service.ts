import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, BillingPlanUpdatedSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { OrganizationServiceInterface } from "../entity-services/organization.service";

@injectable()
export class BillingPlanUpdatedSnsProcessorService implements SnsProcessorServiceInterface {
  private billingPlanUpdatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: BillingPlanUpdatedSnsProcessorServiceConfigInterface,
  ) {
    this.billingPlanUpdatedSnsTopicArn = config.snsTopicArns.billingPlanUpdated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.billingPlanUpdatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<BillingPlanUpdatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { organizationId, billingPlan } } = record;

      await this.organizationService.updateOrganization({ organizationId, updates: { billingPlan } });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface BillingPlanUpdatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "billingPlanUpdated">;
}
