import "reflect-metadata";
import { injectable, inject } from "inversify";
import { MeetingMessageCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MeetingMessageCreatedSnsService extends BaseSnsService<MeetingMessageCreatedSnsMessage> implements MeetingMessageCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingMessageCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.meetingMessageCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: MeetingMessageCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMessageCreatedSnsServiceInterface {
  sendMessage(message: MeetingMessageCreatedSnsMessage): Promise<void>;
}

export interface MeetingMessageCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "meetingMessageCreated">;
}
