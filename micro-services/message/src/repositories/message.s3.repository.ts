import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseS3Repository, LoggerService, S3Factory } from "@yac/util";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MessageS3Repository extends BaseS3Repository implements MessageS3RepositoryInterface {
  constructor(@inject(TYPES.S3Factory) protected s3Factory: S3Factory, @inject(TYPES.LoggerServiceInterface) protected loggerService: LoggerService, @inject(TYPES.EnvConfigInterface) private envConfig: MessageS3RepositoryConfigInterface) {
    super(envConfig.bucketNames.messages, s3Factory, loggerService);
  }
}

export type MessageS3RepositoryInterface = BaseS3Repository;

interface MessageS3RepositoryConfigInterface extends Pick<EnvConfigInterface, "bucketNames"> {
  bucketNames: Pick<EnvConfigInterface["bucketNames"], "messages">
}
