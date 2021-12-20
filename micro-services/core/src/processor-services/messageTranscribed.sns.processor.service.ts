import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MessageTranscribedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/messageTranscribed.snsMessage.model";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { MessageServiceInterface } from "../services/tier-2/message.service";

@injectable()
export class MessageTranscribedSnsProcessorService implements SnsProcessorServiceInterface {
  private messageTranscribedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageTranscribedSnsProcessorServiceConfigInterface,
  ) {
    this.messageTranscribedSnsTopicArn = envConfig.snsTopicArns.messageTranscribed;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.messageTranscribedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<MessageTranscribedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { messageId, transcript } } = record;

      await this.messageService.convertPendingToRegularMessage({ messageId, transcript });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageTranscribedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageTranscribed">;
}
