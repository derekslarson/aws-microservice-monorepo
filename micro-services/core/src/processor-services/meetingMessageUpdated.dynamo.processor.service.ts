import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { MeetingMessageUpdatedSnsServiceInterface } from "../sns-services/meetingMessageUpdated.sns.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { RawMessage } from "../repositories/message.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { MeetingId } from "../types/meetingId.type";

@injectable()
export class MeetingMessageUpdatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingMessageUpdatedSnsServiceInterface) private meetingMessageUpdatedSnsService: MeetingMessageUpdatedSnsServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserUpdatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMessage = record.newImage.entityType === EntityType.Message;
      const isMeetingMessage = isMessage && (record.newImage as RawMessage).conversationId.startsWith(KeyPrefix.MeetingConversation);
      const isUpdate = record.eventName === "MODIFY";

      return isCoreTable && isMeetingMessage && isUpdate;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id, conversationId, from } } = record;

      const [ { message }, { meeting }, { user }, { users: meetingMembers } ] = await Promise.all([
        this.messageMediatorService.getMessage({ messageId: id }),
        this.meetingMediatorService.getMeeting({ meetingId: conversationId as MeetingId }),
        this.userMediatorService.getUser({ userId: from }),
        this.userMediatorService.getUsersByMeetingId({ meetingId: conversationId as MeetingId }),
      ]);

      const meetingMemberIds = meetingMembers.map((meetingMember) => meetingMember.id);

      await this.meetingMessageUpdatedSnsService.sendMessage({ meetingMemberIds, to: meeting, from: user, message });
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
