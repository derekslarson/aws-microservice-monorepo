import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface, MeetingId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserAddedToMeetingSnsServiceInterface } from "../sns-services/userAddedToMeeting.sns.service";
import { RawMembership } from "../repositories/membership.dynamo.repository";
import { MembershipType } from "../enums/membershipType.enum";
import { MeetingServiceInterface } from "../services/tier-1/meeting.service";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class UserAddedToMeetingDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserAddedToMeetingSnsServiceInterface) private userAddedToMeetingSnsService: UserAddedToMeetingSnsServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private teamService: MeetingServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToMeetingDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMembership = record.newImage.entityType === EntityType.Membership;
      const isMeetingMembership = (record.newImage as RawMembership).type === MembershipType.Meeting;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isMembership && isMeetingMembership && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMembership>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { entityId, userId } } = record;
      const meetingId = entityId as MeetingId;

      const [ { users: meetingMembers }, { user }, { meeting } ] = await Promise.all([
        this.userService.getUsersByEntityId({ entityId: meetingId }),
        this.userService.getUser({ userId }),
        this.teamService.getMeeting({ meetingId }),
      ]);

      const meetingMemberIds = meetingMembers.map((meetingMember) => meetingMember.id);

      await this.userAddedToMeetingSnsService.sendMessage({
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

export interface UserAddedToMeetingDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
