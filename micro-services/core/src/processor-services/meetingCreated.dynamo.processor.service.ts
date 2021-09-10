import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { RawConversation } from "../repositories/conversation.dynamo.repository";
import { MeetingConversation } from "../entity-services/conversation.service";
import { MeetingCreatedSnsServiceInterface } from "../sns-services/meetingCreated.sns.service";

@injectable()
export class MeetingCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingCreatedSnsServiceInterface) private meetingCreatedSnsService: MeetingCreatedSnsServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMeeting = record.newImage.entityType === EntityType.MeetingConversation;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isMeeting && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawConversation<MeetingConversation>>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id: meetingId } } = record;

      const { meeting } = await this.meetingMediatorService.getMeeting({ meetingId });

      await this.meetingCreatedSnsService.sendMessage({ meeting, meetingMemberIds: [ meeting.createdBy ] });
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
