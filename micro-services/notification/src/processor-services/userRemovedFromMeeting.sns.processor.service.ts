import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserRemovedFromMeetingSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";

@injectable()
export class UserRemovedFromMeetingSnsProcessorService implements SnsProcessorServiceInterface {
  private userRemovedFromMeetingSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromMeetingSnsProcessorServiceConfigInterface,
  ) {
    this.userRemovedFromMeetingSnsTopicArn = envConfig.snsTopicArns.userRemovedFromMeeting;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userRemovedFromMeetingSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserRemovedFromMeetingSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { meeting, user, meetingMemberIds } } = record;

      await Promise.all(meetingMemberIds.map((meetingMemberId) => this.webSocketMediatorService.sendMessage({
        userId: meetingMemberId,
        event: WebSocketEvent.UserRemovedFromMeeting,
        data: { meeting, user },
      })));

      // add support for push notifications
      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromMeetingSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userRemovedFromMeeting">;
}
