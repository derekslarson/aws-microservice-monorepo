import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface, OrganizationId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserAddedToOrganizationSnsServiceInterface } from "../sns-services/userAddedToOrganization.sns.service";
import { RawMembership } from "../repositories/membership.dynamo.repository";
import { MembershipType } from "../enums/membershipType.enum";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class UserAddedToOrganizationDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserAddedToOrganizationSnsServiceInterface) private userAddedToOrganizationSnsService: UserAddedToOrganizationSnsServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToOrganizationDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMembership = record.newImage.entityType === EntityType.Membership;
      const isOrganizationMembership = (record.newImage as RawMembership).type === MembershipType.Organization;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isMembership && isOrganizationMembership && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMembership>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { entityId, userId, role } } = record;
      const organizationId = entityId as OrganizationId;

      const [ { users: organizationMembers }, { user }, { organization } ] = await Promise.all([
        this.userService.getUsersByEntityId({ entityId: organizationId }),
        this.userService.getUser({ userId }),
        this.organizationService.getOrganization({ organizationId }),
      ]);

      const organizationMemberIds = organizationMembers.map((organizationMember) => organizationMember.id);

      await this.userAddedToOrganizationSnsService.sendMessage({
        organization,
        user,
        role,
        organizationMemberIds,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToOrganizationDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
