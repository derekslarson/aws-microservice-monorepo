import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../inversion-of-control/types";

import { BaseS3Repository, GetSignedUrlInput, GetSignedUrlOutput, HeadObjectInput, HeadObjectOutput } from "./base.s3.repository";
import { S3Factory } from "../factories/s3.factory";
import { LoggerServiceInterface } from "../services/logger.service";

@injectable()
export class RawMessageS3Repository extends BaseS3Repository implements RawMessageFileRepositoryInterface {
  constructor(
  @inject(TYPES.S3Factory) s3Factory: S3Factory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: RawMessageS3RepositoryConfig,
  ) {
    super(envConfig.bucketNames.rawMessage, s3Factory, loggerService);
  }
}

export interface RawMessageFileRepositoryInterface {
  getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
  headObject(params: HeadObjectInput): Promise<HeadObjectOutput>;
}

interface RawMessageS3RepositoryConfig {
  bucketNames: {
    rawMessage: string;
  }
}
