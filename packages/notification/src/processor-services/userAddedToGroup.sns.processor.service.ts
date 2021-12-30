import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserAddedToGroupSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userAddedToGroup.snsMessage.model";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";

@injectable()
export class UserAddedToGroupSnsProcessorService implements SnsProcessorServiceInterface {
  private userAddedToGroupSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.PushNotificationMediatorServiceInterface) private pushNotificationMediatorService: PushNotificationMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToGroupSnsProcessorServiceConfigInterface,
  ) {
    this.userAddedToGroupSnsTopicArn = envConfig.snsTopicArns.userAddedToGroup;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userAddedToGroupSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserAddedToGroupSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { group, user, groupMemberIds } } = record;

      await Promise.allSettled([
        this.pushNotificationMediatorService.sendPushNotification({
          userId: user.id,
          event: PushNotificationEvent.UserAddedToGroup,
          title: "Added to Group",
          body: `You've been added to the group ${group.name}`,
        }),
        ...groupMemberIds.map((groupMemberId) => this.webSocketMediatorService.sendMessage({
          userId: groupMemberId,
          event: WebSocketEvent.UserAddedToGroup,
          data: { group, user },
        })),
      ]);

      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToGroupSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedToGroup">;
}
