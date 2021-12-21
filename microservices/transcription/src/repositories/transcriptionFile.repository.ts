import "reflect-metadata";
import { BaseS3Repository, GetObjectInput, GetObjectOutput, LoggerServiceInterface, S3Factory } from "@yac/util";
import { injectable, inject } from "inversify";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

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
