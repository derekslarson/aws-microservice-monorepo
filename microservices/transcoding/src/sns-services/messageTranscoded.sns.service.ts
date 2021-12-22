import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MessageTranscodedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/messageTranscoded.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class MessageTranscodedSnsService extends BaseSnsService<MessageTranscodedSnsMessage> implements MessageTranscodedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageTranscodedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.messageTranscoded, loggerService, snsFactory);
  }

  public async sendMessage(message: MessageTranscodedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageTranscodedSnsServiceInterface {
  sendMessage(message: MessageTranscodedSnsMessage): Promise<void>;
}

export interface MessageTranscodedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageTranscoded">;
}
