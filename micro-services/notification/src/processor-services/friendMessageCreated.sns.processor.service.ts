import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, FriendMessageCreatedSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";

@injectable()
export class FriendMessageCreatedSnsProcessorService implements SnsProcessorServiceInterface {
  private friendMessageCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.PushNotificationMediatorServiceInterface) private pushNotificationMediatorService: PushNotificationMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: FriendMessageCreatedSnsProcessorServiceConfigInterface,
  ) {
    this.friendMessageCreatedSnsTopicArn = envConfig.snsTopicArns.friendMessageCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.friendMessageCreatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<FriendMessageCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { to, from, message } } = record;

      const senderName = from.realName || from.username || from.email || from.phone as string;

      await Promise.allSettled([
        this.pushNotificationMediatorService.sendPushNotification({
          userId: to.id,
          event: PushNotificationEvent.FriendMessageCreated,
          title: "New Message Received",
          body: `Message from ${senderName}`,
        }),
        ...[ to.id, from.id ].map((userId) => this.webSocketMediatorService.sendMessage({
          userId,
          event: WebSocketEvent.FriendMessageCreated,
          data: { to, from, message },
        })),
      ]);

      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface FriendMessageCreatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "friendMessageCreated">;
}
