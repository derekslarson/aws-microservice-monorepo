import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { GroupMessageCreatedSnsServiceInterface } from "../sns-services/groupMessageCreated.sns.service";
import { RawMessage } from "../repositories/message.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserServiceInterface } from "../services/tier-1/user.service";
import { MessageServiceInterface } from "../services/tier-1/message.service";
import { MessageFetchingServiceInterface } from "../services/tier-2/message.fetching.service";

@injectable()
export class GroupMessageCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupMessageCreatedSnsServiceInterface) private groupMessageCreatedSnsService: GroupMessageCreatedSnsServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageFetchingService: MessageFetchingServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMessage = record.newImage.entityType === EntityType.Message;
      const isGroupMessage = isMessage && (record.newImage as RawMessage).conversationId.startsWith(KeyPrefix.Group);
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isGroupMessage && isCreation;
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
        this.messageFetchingService.getMessage({ messageId: id }),
        this.userService.getUsersByEntityId({ entityId: conversationId }),
      ]);

      const groupMemberIds = groupMembers.map((groupMember) => groupMember.id);

      await Promise.allSettled([
        this.groupMessageCreatedSnsService.sendMessage({ groupMemberIds, message }),
        this.messageService.indexMessageForSearch({ message: record.newImage }),
      ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserCreatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
