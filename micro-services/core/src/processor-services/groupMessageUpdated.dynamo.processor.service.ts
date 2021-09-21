import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { GroupMessageUpdatedSnsServiceInterface } from "../sns-services/groupMessageUpdated.sns.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { RawMessage } from "../repositories/message.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { GroupId } from "../types/groupId.type";
import { MessageServiceInterface } from "../entity-services/message.service";

@injectable()
export class GroupMessageUpdatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupMessageUpdatedSnsServiceInterface) private groupMessageUpdatedSnsService: GroupMessageUpdatedSnsServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserUpdatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMessage = record.newImage.entityType === EntityType.Message;
      const isGroupMessage = isMessage && (record.newImage as RawMessage).conversationId.startsWith(KeyPrefix.GroupConversation);
      const isUpdate = record.eventName === "MODIFY";

      return isCoreTable && isGroupMessage && isUpdate;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id, conversationId } } = record;

      const [ { message }, { users: groupMembers } ] = await Promise.all([
        this.messageMediatorService.getMessage({ messageId: id }),
        this.userMediatorService.getUsersByGroupId({ groupId: conversationId as GroupId }),
      ]);

      const groupMemberIds = groupMembers.map((groupMember) => groupMember.id);

      await Promise.allSettled([
        this.groupMessageUpdatedSnsService.sendMessage({ groupMemberIds, message }),
        this.messageService.indexMessageForSearch({ message: record.newImage }),
      ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserUpdatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
