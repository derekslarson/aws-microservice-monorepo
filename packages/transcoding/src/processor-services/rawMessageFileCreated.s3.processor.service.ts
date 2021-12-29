import "reflect-metadata";
import { injectable, inject } from "inversify";
import { S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "@yac/util/src/services/interfaces/s3.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { TranscodingServiceInterface } from "../services/transcoding.service";

@injectable()
export class RawMessageFileCreatedS3ProcessorService implements S3ProcessorServiceInterface {
  private rawMessageS3BucketName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TranscodingServiceInterface) private transcodingService: TranscodingServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: RawMessageFileCreatedS3ProcessorServiceConfig,
  ) {
    this.rawMessageS3BucketName = config.bucketNames.rawMessage;
  }

  public determineRecordSupport(record: S3ProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.bucketName === this.rawMessageS3BucketName;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: S3ProcessorServiceRecord): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { key } = record;

      await this.transcodingService.startTranscodingJob({ key });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface RawMessageFileCreatedS3ProcessorServiceConfig {
  bucketNames: Pick<EnvConfigInterface["bucketNames"], "rawMessage">;
}
