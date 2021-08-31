import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util";
import { EventBridgeEvent } from "aws-lambda/trigger/eventbridge";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { TranscriptionServiceInterface } from "../services/transcription.service";

@injectable()
export class TranscriptionJobFailedSnsProcessorService implements SnsProcessorServiceInterface {
  private transcriptionJobFailedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TranscriptionServiceInterface) private transcriptionService: TranscriptionServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TranscriptionJobFailedSnsProcessorServiceConfigInterface,
  ) {
    this.transcriptionJobFailedSnsTopicArn = envConfig.snsTopicArns.transcriptionJobFailed;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.transcriptionJobFailedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<TranscriptionJobFailedEvent>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { detail: { TranscriptionJobName } } } = record;

      await this.transcriptionService.transcriptionJobFailed({ transcriptionJobName: TranscriptionJobName });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface TranscriptionJobFailedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "transcriptionJobFailed">;
}

export type TranscriptionJobFailedEvent = Record<string, never> & EventBridgeEvent<"Transcribe Job Event Change", { TranscriptionJobName: string; TranscriptionJobStatus: "FAILED" }>;
