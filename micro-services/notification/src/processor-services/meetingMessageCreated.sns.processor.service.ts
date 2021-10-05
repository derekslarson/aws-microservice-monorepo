import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, MeetingMessageCreatedSnsMessage, Meeting } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";

@injectable()
export class MeetingMessageCreatedSnsProcessorService implements SnsProcessorServiceInterface {
  private meetingMessageCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.PushNotificationMediatorServiceInterface) private pushNotificationMediatorService: PushNotificationMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingMessageCreatedSnsProcessorServiceConfigInterface,
  ) {
    this.meetingMessageCreatedSnsTopicArn = envConfig.snsTopicArns.meetingMessageCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.meetingMessageCreatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<MeetingMessageCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { meetingMemberIds, message } } = record;

      const senderName = message.from.realName || message.from.username || message.from.email || message.from.phone as string;

      const memberIdsOtherThanSender = meetingMemberIds.filter((meetingMemberId) => meetingMemberId !== message.from.id);

      await Promise.allSettled([
        ...memberIdsOtherThanSender.map((memberId) => this.pushNotificationMediatorService.sendPushNotification({
          userId: memberId,
          event: PushNotificationEvent.MeetingMessageCreated,
          title: "New Message Received",
          body: `Message from ${senderName} in ${(message.to as Meeting).name}`,
        })),
        ...meetingMemberIds.map((userId) => this.webSocketMediatorService.sendMessage({
          userId,
          event: WebSocketEvent.MeetingMessageCreated,
          data: { message },
        })),
      ]);

      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMessageCreatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "meetingMessageCreated">;
}
