import "reflect-metadata";
import { injectable, inject } from "inversify";
import { MessageCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MessageCreatedSnsService extends BaseSnsService<MessageCreatedSnsMessage> implements MessageCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.messageCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: MessageCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageCreatedSnsServiceInterface {
  sendMessage(message: MessageCreatedSnsMessage): Promise<void>;
}

export interface MessageCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageCreated">;
}
