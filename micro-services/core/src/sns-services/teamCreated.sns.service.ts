import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TeamCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class TeamCreatedSnsService extends BaseSnsService<TeamCreatedSnsMessage> implements TeamCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.teamCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: TeamCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamCreatedSnsServiceInterface {
  sendMessage(message: TeamCreatedSnsMessage): Promise<void>;
}

export interface TeamCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "teamCreated">;
}
