import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, Role, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserAddedToOrganizationSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { OrganizationAdminMapping, OrganizationAdminMappingRepositoryInterface } from "../repositories/organizationAdminMapping.dynamo.repository";
import { OrganizationStripeMappingRepositoryInterface } from "../repositories/organizationStripeMapping.dynamo.repository";

@injectable()
export class UserAddedToOrganizationSnsProcessorService implements SnsProcessorServiceInterface {
  private userAddedToOrganizationSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationStripeMappingRepositoryInterface) private organizationStripeMappingRepository: OrganizationStripeMappingRepositoryInterface,
    @inject(TYPES.OrganizationAdminMappingRepositoryInterface) private organizationAdminMappingRepository: OrganizationAdminMappingRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToOrganizationSnsProcessorServiceConfigInterface,
  ) {
    this.userAddedToOrganizationSnsTopicArn = envConfig.snsTopicArns.userAddedToOrganization;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userAddedToOrganizationSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserAddedToOrganizationSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { organization, user, role } } = record;

      await this.organizationStripeMappingRepository.incrementSubscriptionItemQuantity({ organizationId: organization.id });

      if (role === Role.Admin) {
        const organizationAdminMapping: OrganizationAdminMapping = {
          organizationId: organization.id,
          userId: user.id,
        };

        await this.organizationAdminMappingRepository.createOrganizationAdminMapping({ organizationAdminMapping });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToOrganizationSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedToOrganization">;
}
