import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserAddedAsFriendSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userAddedAsFriend.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserAddedAsFriendSnsService extends BaseSnsService<UserAddedAsFriendSnsMessage> implements UserAddedAsFriendSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedAsFriendSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userAddedAsFriend, loggerService, snsFactory);
  }

  public async sendMessage(message: UserAddedAsFriendSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedAsFriendSnsServiceInterface {
  sendMessage(message: UserAddedAsFriendSnsMessage): Promise<void>;
}

export interface UserAddedAsFriendSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedAsFriend">
}
