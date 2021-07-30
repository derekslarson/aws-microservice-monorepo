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

  public async uploadFile(params: UploadFileInput): Promise<UploadFileOutput> {
    try {
      this.loggerService.trace("uploadFile called", { params }, this.constructor.name);

      const { key, body, contentType } = params;

      const uploadInput: S3.Types.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      };

      await this.s3.upload(uploadInput).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in uploadFile", { error, params }, this.constructor.name);

      throw error;
    }
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

export interface GetSignedUrlInput {
  operation: "getObject" | "putObject";
  key: string;
  contentType: string;
}

export interface GetSignedUrlOutput {
  signedUrl: string;
}

export interface UploadFileInput {
  key: string;
  body: S3.Body;
  contentType: string;
}

export type UploadFileOutput = void;

interface S3GetSignedUrlInput {
  Bucket: string;
  Key: string;
  ContentType?: string;
}
