import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MessageUpdatedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/messageUpdated.snsMessage.model";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";

@injectable()
export class MessageUpdatedSnsProcessorService implements SnsProcessorServiceInterface {
  private messageUpdatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageUpdatedSnsProcessorServiceConfigInterface,
  ) {
    this.messageUpdatedSnsTopicArn = envConfig.snsTopicArns.messageUpdated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.messageUpdatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<MessageUpdatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { conversationMemberIds, message } } = record;

      await Promise.all(conversationMemberIds.map((userId) => this.webSocketMediatorService.sendMessage({
        userId,
        event: WebSocketEvent.MessageUpdated,
        data: { message },
      })));

      // add support for push notifications
      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageUpdatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageUpdated">;
}
