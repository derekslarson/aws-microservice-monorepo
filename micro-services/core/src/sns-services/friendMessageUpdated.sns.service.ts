import "reflect-metadata";
import { injectable, inject } from "inversify";
import { FriendMessageUpdatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class FriendMessageUpdatedSnsService extends BaseSnsService<FriendMessageUpdatedSnsMessage> implements FriendMessageUpdatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: FriendMessageUpdatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.friendMessageUpdated, loggerService, snsFactory);
  }

  public async sendMessage(message: FriendMessageUpdatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface FriendMessageUpdatedSnsServiceInterface {
  sendMessage(message: FriendMessageUpdatedSnsMessage): Promise<void>;
}

export interface FriendMessageUpdatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "friendMessageUpdated">;
}
