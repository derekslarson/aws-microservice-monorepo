import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedFromMeetingSnsServiceInterface } from "../sns-services/userRemovedFromMeeting.sns.service";
import { RawConversationUserRelationship } from "../repositories/conversationUserRelationship.dynamo.repository";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { ConversationType } from "../enums/conversationType.enum";

@injectable()
export class UserRemovedFromMeetingDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRemovedFromMeetingSnsServiceInterface) private userRemovedFromMeetingSnsService: UserRemovedFromMeetingSnsServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private teamMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromMeetingDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isConversationUserRelationship = record.oldImage.entityType === EntityType.ConversationUserRelationship;
      const isMeetingUserRelationship = (record.oldImage as RawConversationUserRelationship<ConversationType>).type === ConversationType.Meeting;
      const isRemoval = record.eventName === "REMOVE";

      return isCoreTable && isConversationUserRelationship && isMeetingUserRelationship && isRemoval;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawConversationUserRelationship<ConversationType.Meeting>>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { oldImage: { conversationId: meetingId, userId } } = record;

      const [ { users: meetingMembers }, { user }, { meeting } ] = await Promise.all([
        this.userMediatorService.getUsersByMeetingId({ meetingId }),
        this.userMediatorService.getUser({ userId }),
        this.teamMediatorService.getMeeting({ meetingId }),
      ]);

      const meetingMemberIds = meetingMembers.map((meetingMember) => meetingMember.id);

      await this.userRemovedFromMeetingSnsService.sendMessage({
        meetingMemberIds,
        meeting,
        user,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromMeetingDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
