import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserRemovedAsFriendSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserRemovedAsFriendSnsService extends BaseSnsService<UserRemovedAsFriendSnsMessage> implements UserRemovedAsFriendSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedAsFriendSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userRemovedAsFriend, loggerService, snsFactory);
  }

  public async sendMessage(message: UserRemovedAsFriendSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedAsFriendSnsServiceInterface {
  sendMessage(message: UserRemovedAsFriendSnsMessage): Promise<void>;
}

export interface UserRemovedAsFriendSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userRemovedAsFriend">
}
