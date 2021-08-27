import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../inversion-of-control/types";

import { BaseS3Repository, GetSignedUrlInput, GetSignedUrlOutput, HeadObjectInput, HeadObjectOutput } from "./base.s3.repository";
import { S3Factory } from "../factories/s3.factory";
import { LoggerServiceInterface } from "../services/logger.service";

@injectable()
export class EnhancedMessageS3Repository extends BaseS3Repository implements EnhancedMessageFileRepositoryInterface {
  constructor(
  @inject(TYPES.S3Factory) s3Factory: S3Factory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: EnhancedMessageS3RepositoryConfig,
  ) {
    super(envConfig.bucketNames.enhancedMessage, s3Factory, loggerService);
  }
}

export interface EnhancedMessageFileRepositoryInterface {
  getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
  headObject(params: HeadObjectInput): Promise<HeadObjectOutput>;
}

interface EnhancedMessageS3RepositoryConfig {
  bucketNames: {
    enhancedMessage: string;
  }
}
