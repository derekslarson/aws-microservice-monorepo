import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserRemovedFromTeamSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserRemovedFromTeamSnsService extends BaseSnsService<UserRemovedFromTeamSnsMessage> implements UserRemovedFromTeamSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromTeamSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userRemovedFromTeam, loggerService, snsFactory);
  }

  public async sendMessage(message: UserRemovedFromTeamSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromTeamSnsServiceInterface {
  sendMessage(message: UserRemovedFromTeamSnsMessage): Promise<void>;
}

export interface UserRemovedFromTeamSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userRemovedFromTeam">
}
