import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserRemovedFromOrganizationSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { OrganizationAdminMappingRepositoryInterface } from "../repositories/organizationAdminMapping.dynamo.repository";
import { OrganizationStripeMappingRepositoryInterface } from "../repositories/organizationStripeMapping.dynamo.repository";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";

@injectable()
export class UserRemovedFromOrganizationSnsProcessorService implements SnsProcessorServiceInterface {
  private userRemovedFromOrganizationSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.OrganizationStripeMappingRepositoryInterface) private organizationStripeMappingRepository: OrganizationStripeMappingRepositoryInterface,
    @inject(TYPES.OrganizationAdminMappingRepositoryInterface) private organizationAdminMappingRepository: OrganizationAdminMappingRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromOrganizationSnsProcessorServiceConfigInterface,
  ) {
    this.userRemovedFromOrganizationSnsTopicArn = envConfig.snsTopicArns.userRemovedFromOrganization;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userRemovedFromOrganizationSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserRemovedFromOrganizationSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { organization, user } } = record;

      const [ { isOrganizationAdmin } ] = await Promise.all([
        this.organizationService.isOrganizationAdmin({ organizationId: organization.id, userId: user.id }),
        this.organizationStripeMappingRepository.decrementSubscriptionItemQuantity({ organizationId: organization.id }),
      ]);

      if (isOrganizationAdmin) {
        await this.organizationAdminMappingRepository.deleteOrganizationAdminMapping({ organizationId: organization.id, userId: user.id });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromOrganizationSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userRemovedFromOrganization">;
}
