import "reflect-metadata";
import { injectable, inject } from "inversify";
import { MeetingMessageUpdatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MeetingMessageUpdatedSnsService extends BaseSnsService<MeetingMessageUpdatedSnsMessage> implements MeetingMessageUpdatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingMessageUpdatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.meetingMessageUpdated, loggerService, snsFactory);
  }

  public async sendMessage(message: MeetingMessageUpdatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMessageUpdatedSnsServiceInterface {
  sendMessage(message: MeetingMessageUpdatedSnsMessage): Promise<void>;
}

export interface MeetingMessageUpdatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "meetingMessageUpdated">;
}
