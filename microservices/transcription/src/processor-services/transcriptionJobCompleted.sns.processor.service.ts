import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { EventBridgeEvent } from "aws-lambda/trigger/eventbridge";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { TranscriptionServiceInterface } from "../services/transcription.service";

@injectable()
export class TranscriptionJobCompletedSnsProcessorService implements SnsProcessorServiceInterface {
  private transcriptionJobCompletedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TranscriptionServiceInterface) private transcriptionService: TranscriptionServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TranscriptionJobCompletedSnsProcessorServiceConfigInterface,
  ) {
    this.transcriptionJobCompletedSnsTopicArn = envConfig.snsTopicArns.transcriptionJobCompleted;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.transcriptionJobCompletedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<TranscriptionJobCompletedEvent>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { detail: { TranscriptionJobName } } } = record;

      await this.transcriptionService.transcriptionJobCompleted({ transcriptionJobName: TranscriptionJobName });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface TranscriptionJobCompletedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "transcriptionJobCompleted">;
}

export type TranscriptionJobCompletedEvent = Record<string, unknown> & EventBridgeEvent<"Transcribe Job Event Change", { TranscriptionJobName: string; TranscriptionJobStatus: "COMPLETED" }>;
