import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, MeetingCreatedSnsMessage, SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";

@injectable()
export class MeetingCreatedSnsProcessorService implements SnsProcessorServiceInterface {
  private meetingCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingCreatedSnsProcessorServiceConfigInterface,
  ) {
    this.meetingCreatedSnsTopicArn = envConfig.snsTopicArns.meetingCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.meetingCreatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<MeetingCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { meeting, meetingMemberIds } } = record;

      await Promise.all(meetingMemberIds.map((meetingMemberId) => this.webSocketMediatorService.sendMessage({
        userId: meetingMemberId,
        event: WebSocketEvent.MeetingCreated,
        data: { meeting },
      })));

      // add support for push notifications
      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingCreatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "meetingCreated">;
}
