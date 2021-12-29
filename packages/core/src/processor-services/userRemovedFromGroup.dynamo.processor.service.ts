import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedFromGroupSnsServiceInterface } from "../sns-services/userRemovedFromGroup.sns.service";
import { MembershipType } from "../enums/membershipType.enum";
import { RawMembership } from "../repositories/membership.dynamo.repository";
import { GroupServiceInterface } from "../services/tier-1/group.service";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class UserRemovedFromGroupDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRemovedFromGroupSnsServiceInterface) private userRemovedFromGroupSnsService: UserRemovedFromGroupSnsServiceInterface,
    @inject(TYPES.GroupServiceInterface) private teamService: GroupServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromGroupDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMembership = record.oldImage.entityType === EntityType.Membership;
      const isGroupMembership = (record.oldImage as RawMembership).type === MembershipType.Group;
      const isRemoval = record.eventName === "REMOVE";

      return isCoreTable && isMembership && isGroupMembership && isRemoval;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMembership>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { oldImage: { entityId, userId } } = record;
      const groupId = entityId as GroupId;

      const [ { users: groupMembers }, { user }, { group } ] = await Promise.all([
        this.userService.getUsersByEntityId({ entityId: groupId }),
        this.userService.getUser({ userId }),
        this.teamService.getGroup({ groupId }),
      ]);

      const groupMemberIds = groupMembers.map((groupMember) => groupMember.id);

      await this.userRemovedFromGroupSnsService.sendMessage({
        groupMemberIds,
        group,
        user,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromGroupDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
