import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, GroupMessageCreatedSnsMessage, Group } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";

@injectable()
export class GroupMessageCreatedSnsProcessorService implements SnsProcessorServiceInterface {
  private groupMessageCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.PushNotificationMediatorServiceInterface) private pushNotificationMediatorService: PushNotificationMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: GroupMessageCreatedSnsProcessorServiceConfigInterface,
  ) {
    this.groupMessageCreatedSnsTopicArn = envConfig.snsTopicArns.groupMessageCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.groupMessageCreatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<GroupMessageCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { groupMemberIds, message } } = record;

      const senderName = message.from.name || message.from.username || message.from.email || message.from.phone as string;

      const memberIdsOtherThanSender = groupMemberIds.filter((groupMemberId) => groupMemberId !== message.from.id);

      await Promise.allSettled([
        ...memberIdsOtherThanSender.map((memberId) => this.pushNotificationMediatorService.sendPushNotification({
          userId: memberId,
          event: PushNotificationEvent.GroupMessageCreated,
          title: "New Message Received",
          body: `Message from ${senderName} in ${(message.to as Group).name}`,
        })),
        ...groupMemberIds.map((userId) => this.webSocketMediatorService.sendMessage({
          userId,
          event: WebSocketEvent.GroupMessageCreated,
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

export interface GroupMessageCreatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "groupMessageCreated">;
}
