import "reflect-metadata";
import { injectable, inject } from "inversify";
import { MessageTranscribedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MessageTranscribedSnsService extends BaseSnsService<MessageTranscribedSnsMessage> implements MessageTranscribedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageTranscribedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.messageTranscribed, loggerService, snsFactory);
  }

  public async sendMessage(message: MessageTranscribedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageTranscribedSnsServiceInterface {
  sendMessage(message: MessageTranscribedSnsMessage): Promise<void>;
}

export interface MessageTranscribedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageTranscribed">;
}
