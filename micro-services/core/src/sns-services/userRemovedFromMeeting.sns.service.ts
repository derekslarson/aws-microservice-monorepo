import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserRemovedFromMeetingSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserRemovedFromMeetingSnsService extends BaseSnsService<UserRemovedFromMeetingSnsMessage> implements UserRemovedFromMeetingSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromMeetingSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userRemovedFromMeeting, loggerService, snsFactory);
  }

  public async sendMessage(message: UserRemovedFromMeetingSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromMeetingSnsServiceInterface {
  sendMessage(message: UserRemovedFromMeetingSnsMessage): Promise<void>;
}

export interface UserRemovedFromMeetingSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userRemovedFromMeeting">
}
