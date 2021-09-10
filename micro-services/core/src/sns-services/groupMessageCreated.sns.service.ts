import "reflect-metadata";
import { injectable, inject } from "inversify";
import { GroupMessageCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class GroupMessageCreatedSnsService extends BaseSnsService<GroupMessageCreatedSnsMessage> implements GroupMessageCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: GroupMessageCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.groupMessageCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: GroupMessageCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupMessageCreatedSnsServiceInterface {
  sendMessage(message: GroupMessageCreatedSnsMessage): Promise<void>;
}

export interface GroupMessageCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "groupMessageCreated">;
}
