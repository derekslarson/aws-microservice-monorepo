import "reflect-metadata";
import { BaseS3Repository, GetSignedUrlInput, GetSignedUrlOutput, LoggerServiceInterface, S3Factory, UploadFileInput, UploadFileOutput } from "@yac/core";
import { injectable, inject } from "inversify";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class ImageS3Repository extends BaseS3Repository implements ImageFileRepositoryInterface {
  constructor(
  @inject(TYPES.S3Factory) s3Factory: S3Factory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ImageS3RepositoryConfig,
  ) {
    super(envConfig.bucketNames.image, s3Factory, loggerService);
  }
}

export interface ImageFileRepositoryInterface {
  getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
  uploadFile(params: UploadFileInput): Promise<UploadFileOutput>;
}

type ImageS3RepositoryConfig = Pick<EnvConfigInterface, "bucketNames">;
