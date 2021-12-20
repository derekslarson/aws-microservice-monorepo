import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserRemovedFromGroupSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userRemovedFromGroup.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserRemovedFromGroupSnsService extends BaseSnsService<UserRemovedFromGroupSnsMessage> implements UserRemovedFromGroupSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromGroupSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userRemovedFromGroup, loggerService, snsFactory);
  }

  public async sendMessage(message: UserRemovedFromGroupSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromGroupSnsServiceInterface {
  sendMessage(message: UserRemovedFromGroupSnsMessage): Promise<void>;
}

export interface UserRemovedFromGroupSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userRemovedFromGroup">
}
