import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedFromOrganizationSnsServiceInterface } from "../sns-services/userRemovedFromOrganization.sns.service";
import { RawMembership } from "../repositories/membership.dynamo.repository";
import { MembershipType } from "../enums/membershipType.enum";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class UserRemovedFromOrganizationDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRemovedFromOrganizationSnsServiceInterface) private userRemovedFromOrganizationSnsService: UserRemovedFromOrganizationSnsServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromOrganizationDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMembership = record.oldImage.entityType === EntityType.Membership;
      const isOrganizationMembership = (record.oldImage as RawMembership).type === MembershipType.Organization;
      const isRemoval = record.eventName === "REMOVE";

      return isCoreTable && isMembership && isOrganizationMembership && isRemoval;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMembership>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { oldImage: { entityId, userId } } = record;
      const organizationId = entityId as OrganizationId;

      const [ { users: organizationMembers }, { user }, { organization } ] = await Promise.all([
        this.userService.getUsersByEntityId({ entityId: organizationId }),
        this.userService.getUser({ userId }),
        this.organizationService.getOrganization({ organizationId }),
      ]);

      const organizationMemberIds = organizationMembers.map((organizationMember) => organizationMember.id);

      await this.userRemovedFromOrganizationSnsService.sendMessage({ organization, user, organizationMemberIds });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromOrganizationDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
