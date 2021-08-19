import "reflect-metadata";
import { injectable, inject } from "inversify";
import { GroupCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class GroupCreatedSnsService extends BaseSnsService<GroupCreatedSnsMessage> implements GroupCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: GroupCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.groupCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: GroupCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupCreatedSnsServiceInterface {
  sendMessage(message: GroupCreatedSnsMessage): Promise<void>;
}

export interface GroupCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "groupCreated">;
}
