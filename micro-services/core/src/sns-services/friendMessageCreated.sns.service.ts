import "reflect-metadata";
import { injectable, inject } from "inversify";
import { FriendMessageCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class FriendMessageCreatedSnsService extends BaseSnsService<FriendMessageCreatedSnsMessage> implements FriendMessageCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: FriendMessageCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.friendMessageCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: FriendMessageCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface FriendMessageCreatedSnsServiceInterface {
  sendMessage(message: FriendMessageCreatedSnsMessage): Promise<void>;
}

export interface FriendMessageCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "friendMessageCreated">;
}
