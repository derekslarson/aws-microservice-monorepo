import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { RawMeeting } from "../repositories/meeting.dynamo.repository";
import { MeetingCreatedSnsServiceInterface } from "../sns-services/meetingCreated.sns.service";
import { MeetingServiceInterface } from "../services/tier-1/meeting.service";

@injectable()
export class MeetingCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingCreatedSnsServiceInterface) private meetingCreatedSnsService: MeetingCreatedSnsServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMeeting = record.newImage.entityType === EntityType.Meeting;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isMeeting && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMeeting>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id: meetingId } } = record;

      const { meeting } = await this.meetingService.getMeeting({ meetingId });

      await Promise.allSettled([
        this.meetingCreatedSnsService.sendMessage({ meeting, meetingMemberIds: [ meeting.createdBy ] }),
        this.meetingService.indexMeetingForSearch({ meeting: record.newImage }),
      ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingCreatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
