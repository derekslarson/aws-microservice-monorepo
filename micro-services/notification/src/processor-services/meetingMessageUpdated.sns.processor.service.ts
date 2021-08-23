import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, MeetingMessageUpdatedSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";

@injectable()
export class MeetingMessageUpdatedSnsProcessorService implements SnsProcessorServiceInterface {
  private meetingMessageUpdatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingMessageUpdatedSnsProcessorServiceConfigInterface,
  ) {
    this.meetingMessageUpdatedSnsTopicArn = envConfig.snsTopicArns.meetingMessageUpdated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.meetingMessageUpdatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<MeetingMessageUpdatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { meetingMemberIds, to, from, message } } = record;

      await Promise.all(meetingMemberIds.map((userId) => this.webSocketMediatorService.sendMessage({
        userId,
        event: WebSocketEvent.MeetingMessageUpdated,
        data: { to, from, message },
      })));

      // add support for push notifications
      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMessageUpdatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "meetingMessageUpdated">;
}
