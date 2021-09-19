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

  protected async uploadFile(params: UploadFileInput): Promise<UploadFileOutput> {
    try {
      this.loggerService.trace("uploadFile called", { params }, this.constructor.name);

      const { key, body, mimeType } = params;

      const uploadInput: S3.Types.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: mimeType,
      };

      await this.s3.upload(uploadInput).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in uploadFile", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);

      const getSignedUrlInput: S3GetSignedUrlInput = {
        Bucket: this.bucketName,
        Key: params.key,
      };

      if (params.operation === "upload") {
        getSignedUrlInput.ContentType = params.mimeType;
      }

      const operation = params.operation === "get" ? "getObject" : "putObject";

      const signedUrl = this.s3.getSignedUrl(operation, getSignedUrlInput);

      return { signedUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSignedUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getObject(params: GetObjectInput): Promise<GetObjectOutput> {
    try {
      this.loggerService.trace("getObject called", { params }, this.constructor.name);

      const { key } = params;

      const getObjectInput: S3.HeadObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
      };

      const getObjectOutput = await this.s3.getObject(getObjectInput).promise();

      return getObjectOutput;
    } catch (error: unknown) {
      this.loggerService.error("Error in getObject", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async headObject(params: HeadObjectInput): Promise<HeadObjectOutput> {
    try {
      this.loggerService.trace("headObject called", { params }, this.constructor.name);

      const { key } = params;

      const headObjectInput: S3.HeadObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
      };

      const headObjectOutput = await this.s3.headObject(headObjectInput).promise();

      return headObjectOutput;
    } catch (error: unknown) {
      this.loggerService.error("Error in headObject", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

interface BaseGetSignedUrlInput {
  operation: "get" | "upload";
  key: string;
}

interface GetSignedUrlGetObjectInput extends BaseGetSignedUrlInput {
  operation: "get";
}

interface GetSignedUrlPutObjectInput extends BaseGetSignedUrlInput {
  operation: "upload";
  mimeType: string;
}

export type GetSignedUrlInput = GetSignedUrlGetObjectInput | GetSignedUrlPutObjectInput;

export interface GetSignedUrlOutput {
  signedUrl: string;
}

export interface UploadFileInput {
  key: string;
  body: S3.Body;
  mimeType: string;
}

export type UploadFileOutput = void;

export interface HeadObjectInput {
  key: string;
}

export type HeadObjectOutput = S3.HeadObjectOutput;

export interface GetObjectInput {
  key: string;
}

export type GetObjectOutput = S3.GetObjectOutput;

interface S3GetSignedUrlInput {
  Bucket: string;
  Key: string;
  ContentType?: string;
}
