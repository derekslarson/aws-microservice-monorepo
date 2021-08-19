import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { FriendMessageCreatedSnsServiceInterface } from "../sns-services/friendMessageCreated.sns.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { RawMessage } from "../repositories/message.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { UserId } from "../types/userId.type";

@injectable()
export class FriendMessageCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.FriendMessageCreatedSnsServiceInterface) private friendMessageCreatedSnsService: FriendMessageCreatedSnsServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMessage = record.newImage.entityType === EntityType.Message;
      const isFriendMessage = isMessage && (record.newImage as RawMessage).conversationId.startsWith(KeyPrefix.FriendConversation);
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isFriendMessage && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id, conversationId, from } } = record;
      const toUserId = conversationId.replace(KeyPrefix.FriendConversation, "").replace(from, "").replace(/^-|-$/, "") as UserId;

      const [ { message }, { user: toUser }, { user: fromUser } ] = await Promise.all([
        this.messageMediatorService.getMessage({ messageId: id }),
        this.userMediatorService.getUser({ userId: toUserId }),
        this.userMediatorService.getUser({ userId: from }),
      ]);

      await this.friendMessageCreatedSnsService.sendMessage({ message, to: toUser, from: fromUser });
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
