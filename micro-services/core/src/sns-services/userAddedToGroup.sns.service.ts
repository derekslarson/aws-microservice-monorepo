import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserAddedToGroupSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserAddedToGroupSnsService extends BaseSnsService<UserAddedToGroupSnsMessage> implements UserAddedToGroupSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToGroupSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userAddedToGroup, loggerService, snsFactory);
  }

  public async sendMessage(message: UserAddedToGroupSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToGroupSnsServiceInterface {
  sendMessage(message: UserAddedToGroupSnsMessage): Promise<void>;
}

export interface UserAddedToGroupSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedToGroup">
}
