import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import S3 from "aws-sdk/clients/s3";
import { LoggerServiceInterface } from "../services/logger.service";
import { S3Factory } from "../factories/s3.factory";

@injectable()
export abstract class BaseS3Repository {
  protected bucketName: string;

  protected s3: S3;

  constructor(
  @unmanaged() bucketName: string,
    @unmanaged() s3Factory: S3Factory,
    @unmanaged() protected loggerService: LoggerServiceInterface,
  ) {
    this.bucketName = bucketName;
    this.s3 = s3Factory();
  }

  public getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);
      const { operation, key, contentType } = params;

      const getSignedUrlInput: S3GetSignedUrlInput = {
        Bucket: this.bucketName,
        Key: key,
      };

      if (operation === "putObject") {
        getSignedUrlInput.ContentType = contentType;
      }

      const signedUrl = this.s3.getSignedUrl(operation, getSignedUrlInput);

      return { signedUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSignedUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

interface S3GetSignedUrlInput {
  Bucket: string;
  Key: string;
  ContentType?: string;
}

export interface GetSignedUrlInput {
  operation: "getObject" | "putObject";
  key: string;
  contentType: string;
}

export interface GetSignedUrlOutput {
  signedUrl: string;
}
