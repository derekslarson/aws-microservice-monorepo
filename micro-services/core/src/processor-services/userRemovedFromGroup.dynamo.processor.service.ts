import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedFromGroupSnsServiceInterface } from "../sns-services/userRemovedFromGroup.sns.service";
import { RawConversationUserRelationship } from "../repositories/conversationUserRelationship.dynamo.repository";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { ConversationType } from "../enums/conversationType.enum";

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
      const isConversationUserRelationship = record.oldImage.entityType === EntityType.ConversationUserRelationship;
      const isGroupConversationUserRelationship = (record.oldImage as RawConversationUserRelationship<ConversationType>).type === ConversationType.Group;
      const isRemoval = record.eventName === "REMOVE";

      return isCoreTable && isConversationUserRelationship && isGroupConversationUserRelationship && isRemoval;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawConversationUserRelationship<ConversationType.Group>>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { oldImage: { conversationId: groupId, userId } } = record;

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
