import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, MessageCreatedSnsMessage, ConversationType, User } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";

@injectable()
export class MessageCreatedSnsProcessorService implements SnsProcessorServiceInterface {
  private messageCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.PushNotificationMediatorServiceInterface) private pushNotificationMediatorService: PushNotificationMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageCreatedSnsProcessorServiceConfigInterface,
  ) {
    this.messageCreatedSnsTopicArn = envConfig.snsTopicArns.messageCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.messageCreatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<MessageCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { conversationMemberIds, message } } = record;

      const senderName = message.from.name || message.from.username || message.from.email || message.from.phone as string;

      let toName: string;

      if (message.type === ConversationType.OneOnOne) {
        const toUser = message.to as User;

        toName = toUser.name || toUser.username || toUser.email || toUser.phone as string;
      } else {
        toName = message.to.name as string;
      }

      const memberIdsOtherThanSender = conversationMemberIds.filter((conversationMemberId) => conversationMemberId !== message.from.id);

      await Promise.allSettled([
        ...memberIdsOtherThanSender.map((memberId) => this.pushNotificationMediatorService.sendPushNotification({
          userId: memberId,
          event: PushNotificationEvent.MessageCreated,
          title: "New Message Received",
          body: `Message from ${senderName} ${message.type === ConversationType.OneOnOne ? "to" : "in"} ${toName}`,
        })),
        ...conversationMemberIds.map((userId) => this.webSocketMediatorService.sendMessage({
          userId,
          event: WebSocketEvent.MessageCreated,
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

export interface MessageCreatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageCreated">;
}
