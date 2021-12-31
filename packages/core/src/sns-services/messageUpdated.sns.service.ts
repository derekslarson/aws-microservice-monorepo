import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MessageUpdatedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/messageUpdated.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
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
