import "reflect-metadata";
import { injectable, inject } from "inversify";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

import { BaseS3Repository, GetSignedUrlInput, GetSignedUrlOutput } from "./base.s3.repository";
import { S3Factory } from "../factories/s3.factory";
import { LoggerServiceInterface } from "../services/logger.service";

@injectable()
export class MessageS3Repository extends BaseS3Repository implements MessageFileRepositoryInterface {
  constructor(
  @inject(TYPES.S3Factory) s3Factory: S3Factory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageS3RepositoryConfig,
  ) {
    super(envConfig.bucketNames.message, s3Factory, loggerService);
  }
}

export interface MessageFileRepositoryInterface {
  getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
}

interface MessageS3RepositoryConfig extends EnvConfigInterface {
  bucketNames: {
    message: string;
  }
}
