import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { TranscriptionServiceInterface } from "../services/transcription.service";

@injectable()
export class TranscriptionFileCreatedS3ProcessorService implements S3ProcessorServiceInterface {
  private transcriptionS3BucketName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TranscriptionServiceInterface) private transcriptionService: TranscriptionServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: TranscriptionFileCreatedS3ProcessorServiceConfig,
  ) {
    this.transcriptionS3BucketName = config.bucketNames.transcription;
  }

  public determineRecordSupport(record: S3ProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isTranscriptionBucket = record.bucketName === this.transcriptionS3BucketName;
      const isJsonFile = record.key.endsWith(".json");

      return isTranscriptionBucket && isJsonFile;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: S3ProcessorServiceRecord): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { key } = record;

      await this.transcriptionService.transcriptionJobComplete({ key });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface TranscriptionFileCreatedS3ProcessorServiceConfig {
  bucketNames: Pick<EnvConfigInterface["bucketNames"], "transcription">;
}
