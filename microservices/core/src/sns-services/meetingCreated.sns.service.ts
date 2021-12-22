import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MeetingCreatedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/meetingCreated.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MeetingCreatedSnsService extends BaseSnsService<MeetingCreatedSnsMessage> implements MeetingCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.meetingCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: MeetingCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingCreatedSnsServiceInterface {
  sendMessage(message: MeetingCreatedSnsMessage): Promise<void>;
}

export interface MeetingCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "meetingCreated">;
}
