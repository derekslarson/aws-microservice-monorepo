import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserRemovedAsFriendSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userRemovedAsFriend.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
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
