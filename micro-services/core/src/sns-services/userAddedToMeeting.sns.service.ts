import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserAddedToMeetingSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserAddedToMeetingSnsService extends BaseSnsService<UserAddedToMeetingSnsMessage> implements UserAddedToMeetingSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToMeetingSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userAddedToMeeting, loggerService, snsFactory);
  }

  public async sendMessage(message: UserAddedToMeetingSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToMeetingSnsServiceInterface {
  sendMessage(message: UserAddedToMeetingSnsMessage): Promise<void>;
}

export interface UserAddedToMeetingSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedToMeeting">
}
