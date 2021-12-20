import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { MessageUpdatedSnsServiceInterface } from "../sns-services/messageUpdated.sns.service";
import { RawMessage } from "../repositories/message.dynamo.repository";
import { UserServiceInterface } from "../services/tier-1/user.service";
import { MessageServiceInterface } from "../services/tier-2/message.service";

@injectable()
export class MessageUpdatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageUpdatedSnsServiceInterface) private messageUpdatedSnsService: MessageUpdatedSnsServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
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
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isMessage && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id, conversationId } } = record;

      const [ { message }, { users: conversationMembers } ] = await Promise.all([
        this.messageService.getMessage({ messageId: id }),
        this.userService.getUsersByEntityId({ entityId: conversationId }),
      ]);

      const conversationMemberIds = conversationMembers.map((conversationMember) => conversationMember.id);

      await Promise.allSettled([
        this.messageUpdatedSnsService.sendMessage({ conversationMemberIds, message }),
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
