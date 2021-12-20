import "reflect-metadata";
import { injectable, inject } from "inversify";
import { MessageUpdatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MessageUpdatedSnsService extends BaseSnsService<MessageUpdatedSnsMessage> implements MessageUpdatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageUpdatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.messageUpdated, loggerService, snsFactory);
  }

  public async sendMessage(message: MessageUpdatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageUpdatedSnsServiceInterface {
  sendMessage(message: MessageUpdatedSnsMessage): Promise<void>;
}

export interface MessageUpdatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageUpdated">;
}
