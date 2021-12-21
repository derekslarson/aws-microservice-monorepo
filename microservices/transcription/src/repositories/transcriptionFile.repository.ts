import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseS3Repository, GetObjectInput, GetObjectOutput } from "@yac/util/src/repositories/base.s3.repository";
import { S3Factory } from "@yac/util/src/factories/s3.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class TranscriptionS3Repository extends BaseS3Repository implements TranscriptionFileRepositoryInterface {
  constructor(
  @inject(TYPES.S3Factory) s3Factory: S3Factory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TranscriptionS3RepositoryConfig,
  ) {
    super(envConfig.bucketNames.transcription, s3Factory, loggerService);
  }
}

export interface TranscriptionFileRepositoryInterface {
  getObject(params: GetObjectInput): Promise<GetObjectOutput>;
}

export interface TranscriptionS3RepositoryConfig {
  bucketNames: Pick<EnvConfigInterface["bucketNames"], "transcription">;
}
