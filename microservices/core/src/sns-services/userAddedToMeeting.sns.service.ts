import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserAddedToMeetingSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userAddedToMeeting.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
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
