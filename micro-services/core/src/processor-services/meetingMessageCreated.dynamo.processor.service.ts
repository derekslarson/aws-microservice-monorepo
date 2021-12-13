import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { MeetingMessageCreatedSnsServiceInterface } from "../sns-services/meetingMessageCreated.sns.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { RawMessage } from "../repositories/message.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { MeetingId } from "../types/meetingId.type";
import { MessageServiceInterface } from "../entity-services/message.service";

@injectable()
export class MeetingMessageCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingMessageCreatedSnsServiceInterface) private meetingMessageCreatedSnsService: MeetingMessageCreatedSnsServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMessage = record.newImage.entityType === EntityType.Message;
      const isMeetingMessage = isMessage && (record.newImage as RawMessage).conversationId.startsWith(KeyPrefix.Meeting);
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isMeetingMessage && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id, conversationId } } = record;

      const [ { message }, { users: meetingMembers } ] = await Promise.all([
        this.messageMediatorService.getMessage({ messageId: id }),
        this.userMediatorService.getUsersByMeetingId({ meetingId: conversationId as MeetingId }),
      ]);

      const meetingMemberIds = meetingMembers.map((meetingMember) => meetingMember.id);

      await Promise.allSettled([
        this.meetingMessageCreatedSnsService.sendMessage({ meetingMemberIds, message }),
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
