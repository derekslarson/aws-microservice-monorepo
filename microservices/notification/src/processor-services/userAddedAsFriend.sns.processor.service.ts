import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserAddedAsFriendSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userAddedAsFriend.snsMessage.model";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";

@injectable()
export class UserAddedAsFriendSnsProcessorService implements SnsProcessorServiceInterface {
  private userAddedAsFriendSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.PushNotificationMediatorServiceInterface) private pushNotificationMediatorService: PushNotificationMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedAsFriendSnsProcessorServiceConfigInterface,
  ) {
    this.userAddedAsFriendSnsTopicArn = envConfig.snsTopicArns.userAddedAsFriend;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userAddedAsFriendSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserAddedAsFriendSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { addingUser, addedUser } } = record;

      const addingUserName = addingUser.name || addingUser.username || addingUser.email || addingUser.phone as string;

      await Promise.allSettled([
        this.pushNotificationMediatorService.sendPushNotification({
          userId: addedUser.id,
          event: PushNotificationEvent.UserAddedAsFriend,
          title: "Added as Friend",
          body: `${addingUserName} added you as a friend`,
        }),
        ...[ addingUser.id, addedUser.id ].map((userId) => this.webSocketMediatorService.sendMessage({
          userId,
          event: WebSocketEvent.UserAddedAsFriend,
          data: { addingUser, addedUser },
        })),
      ]);

      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedAsFriendSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedAsFriend">;
}
