import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, GroupId, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedFromGroupSnsServiceInterface } from "../sns-services/userRemovedFromGroup.sns.service";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { MembershipType } from "../enums/membershipType.enum";
import { RawMembership } from "../repositories/membership.dynamo.repository";

@injectable()
export class UserRemovedFromGroupDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRemovedFromGroupSnsServiceInterface) private userRemovedFromGroupSnsService: UserRemovedFromGroupSnsServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private teamMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
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
        this.userMediatorService.getUsersByGroupId({ groupId }),
        this.userMediatorService.getUser({ userId }),
        this.teamMediatorService.getGroup({ groupId }),
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
