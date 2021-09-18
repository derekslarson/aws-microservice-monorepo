import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../inversion-of-control/types";
import { S3Factory } from "../factories/s3.factory";
import { LoggerServiceInterface } from "../services/logger.service";
import { BaseMessageS3Repository, MessageFileRepositoryInterface } from "./base.message.s3.repository";

@injectable()
export class EnhancedMessageS3Repository extends BaseMessageS3Repository implements MessageFileRepositoryInterface {
  constructor(
  @inject(TYPES.S3Factory) s3Factory: S3Factory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: EnhancedMessageS3RepositoryConfig,
  ) {
    super(envConfig.bucketNames.enhancedMessage, s3Factory, loggerService);
  }
}

interface EnhancedMessageS3RepositoryConfig {
  bucketNames: {
    enhancedMessage: string;
  }
}
