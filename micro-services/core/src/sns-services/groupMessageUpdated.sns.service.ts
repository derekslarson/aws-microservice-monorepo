import "reflect-metadata";
import { injectable, inject } from "inversify";
import { GroupMessageUpdatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class GroupMessageUpdatedSnsService extends BaseSnsService<GroupMessageUpdatedSnsMessage> implements GroupMessageUpdatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: GroupMessageUpdatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.groupMessageUpdated, loggerService, snsFactory);
  }

  public async sendMessage(message: GroupMessageUpdatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupMessageUpdatedSnsServiceInterface {
  sendMessage(message: GroupMessageUpdatedSnsMessage): Promise<void>;
}

export interface GroupMessageUpdatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "groupMessageUpdated">;
}
