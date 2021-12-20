import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserCreatedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userCreated.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserCreatedSnsService extends BaseSnsService<UserCreatedSnsMessage> implements UserCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: UserCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserCreatedSnsServiceInterface {
  sendMessage(message: UserCreatedSnsMessage): Promise<void>;
}

export interface UserCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userCreated">
}
