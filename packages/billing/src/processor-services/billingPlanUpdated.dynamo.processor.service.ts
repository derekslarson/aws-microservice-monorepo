import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { BillingPlanUpdatedSnsServiceInterface } from "../sns-services/billingPlanUpdated.sns.service";
import { RawOrganizationStripeMapping } from "../repositories/organizationStripeMapping.dynamo.repository";

@injectable()
export class BillingPlanUpdatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private billingPlanTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.BillingPlanUpdatedSnsServiceInterface) private billingPlanUpdatedSnsService: BillingPlanUpdatedSnsServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: BillingPlanUpdatedDynamoProcessorServiceConfigInterface,
  ) {
    this.billingPlanTableName = config.tableNames.billing;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isBillingTable = record.tableName === this.billingPlanTableName;
      const isUpdate = record.eventName === "MODIFY";
      const isOrganizationStripeMapping = this.isOrganizationStripeMappingRecord(record);
      const isBillingPlanUpdate = this.isOrganizationStripeMappingRecord(record) && record.newImage.plan !== record.oldImage.plan;

      return isBillingTable && isOrganizationStripeMapping && isUpdate && isBillingPlanUpdate;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawOrganizationStripeMapping>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { organizationId, plan: billingPlan } } = record;

      await this.billingPlanUpdatedSnsService.sendMessage({ organizationId, billingPlan });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }

  private isOrganizationStripeMappingRecord(record: DynamoProcessorServiceRecord): record is DynamoProcessorServiceRecord<RawOrganizationStripeMapping> {
    try {
      this.loggerService.trace("isOrganizationStripeMappingRecord called", { record }, this.constructor.name);

      return record.newImage.entityType === EntityType.OrganizationStripeMapping;
    } catch (error: unknown) {
      this.loggerService.error("Error in isOrganizationStripeMappingRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface BillingPlanUpdatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    billing: EnvConfigInterface["tableNames"]["billing"];
  }
}
