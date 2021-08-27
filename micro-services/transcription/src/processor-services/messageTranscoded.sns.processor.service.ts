import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, MessageTranscodedSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { TranscriptionServiceInterface } from "../services/transcription.service";

@injectable()
export class MessageTranscodedSnsProcessorService implements SnsProcessorServiceInterface {
  private messageTranscodedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TranscriptionServiceInterface) private transcriptionService: TranscriptionServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageTranscodedSnsProcessorServiceConfigInterface,
  ) {
    this.messageTranscodedSnsTopicArn = envConfig.snsTopicArns.messageTranscoded;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.messageTranscodedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<MessageTranscodedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { key } } = record;

      await this.transcriptionService.startTranscriptionJob({ key });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageTranscodedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "messageTranscoded">;
}
