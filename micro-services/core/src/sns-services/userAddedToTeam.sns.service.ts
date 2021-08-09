import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserAddedToTeamSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserAddedToTeamSnsService extends BaseSnsService<UserAddedToTeamSnsMessage> implements UserAddedToTeamSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToTeamSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userAddedToTeam, loggerService, snsFactory);
  }

  public async sendMessage(message: UserAddedToTeamSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToTeamSnsServiceInterface {
  sendMessage(message: UserAddedToTeamSnsMessage): Promise<void>;
}

export interface UserAddedToTeamSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedToTeam">
}
