import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { TranscodingServiceInterface } from "../services/transcoding.service";

@injectable()
export class EnhancedMessageFileCreatedS3ProcessorService implements S3ProcessorServiceInterface {
  private enhancedMessageS3BucketName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TranscodingServiceInterface) private transcodingService: TranscodingServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: EnhancedMessageFileCreatedS3ProcessorServiceConfig,
  ) {
    this.enhancedMessageS3BucketName = config.bucketNames.enhancedMessage;
  }

  public determineRecordSupport(record: S3ProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.bucketName === this.enhancedMessageS3BucketName;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: S3ProcessorServiceRecord): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { key } = record;

      await this.transcodingService.transcodingJobComplete({ key });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface EnhancedMessageFileCreatedS3ProcessorServiceConfig {
  bucketNames: Pick<EnvConfigInterface["bucketNames"], "enhancedMessage">;
}
