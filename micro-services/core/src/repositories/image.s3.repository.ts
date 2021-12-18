/* eslint-disable consistent-return */
import "reflect-metadata";
import {
  BaseS3Repository,
  IdServiceInterface,
  LoggerServiceInterface,
  S3Factory,
  UploadFileInput as BaseUploadFileInput,
  UploadFileOutput as BaseUploadFileOutput,
  GetSignedUrlInput as BaseGetSignedUrlInput,
  GetSignedUrlOutput as BaseGetSignedUrlOutput,
  FileOperation,
  OrganizationId,
  UserId,
  TeamId,
  GroupId,
  MeetingId,
} from "@yac/util";
import { injectable, inject } from "inversify";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { ImageMimeType } from "../enums/image.mimeType.enum";

import { EntityType } from "../enums/entityType.enum";
import { Identicon, IdenticonFactory } from "../factories/identicon.factory";

@injectable()
export class ImageS3Repository extends BaseS3Repository implements ImageFileRepositoryInterface {
  private identicon: Identicon;

  private readonly mimeTypeToFileExtensionMap: Record<ImageMimeType, FileExtension> = {
    [ImageMimeType.Jpeg]: "jpeg",
    [ImageMimeType.Bmp]: "bmp",
    [ImageMimeType.Png]: "png",
  };

  private readonly entityTypeToDirectoryMap: Record<ImageEntityType, FileDirectory> = {
    [EntityType.User]: "users",
    [EntityType.Organization]: "organizations",
    [EntityType.Team]: "teams",
    [EntityType.Group]: "groups",
    [EntityType.Meeting]: "meetings",
  };

  constructor(
  @inject(TYPES.S3Factory) s3Factory: S3Factory,
    @inject(TYPES.IdenticonFactory) identiconFactory: IdenticonFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ImageS3RepositoryConfig,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
  ) {
    super(envConfig.bucketNames.image, s3Factory, loggerService);

    this.identicon = identiconFactory();
  }

  public createDefaultImage(): CreateDefaultImageOutput {
    try {
      this.loggerService.trace("createDefaultImage called", {}, this.constructor.name);

      this.identicon.configure({
        hues: [ 48 ],
        lightness: {
          color: [ 0.40, 0.69 ],
          grayscale: [ 0.47, 0.90 ],
        },
        saturation: {
          color: 1.00,
          grayscale: 0.00,
        },
        backColor: "#fff",
      });

      const image = this.identicon.toPng(this.idService.generateId(), 100);

      return { image, mimeType: ImageMimeType.Png };
    } catch (error: unknown) {
      this.loggerService.error("Error in createDefaultImage", { error }, this.constructor.name);

      throw error;
    }
  }

  public override async uploadFile(params: UploadFileInput): Promise<UploadFileOutput> {
    try {
      this.loggerService.trace("uploadFile called", { params }, this.constructor.name);

      if ("key" in params) {
        return super.uploadFile(params);
      }

      const { entityType, entityId, file, mimeType } = params;

      const { key } = this.createKey({ entityType, entityId, mimeType });

      await this.uploadFile({
        key,
        body: file,
        mimeType,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in uploadFile", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public override getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);

      if ("key" in params) {
        return super.getSignedUrl(params);
      }

      const { operation, entityType, entityId, mimeType } = params;

      const { key } = this.createKey({ entityType, entityId, mimeType });

      const { signedUrl } = super.getSignedUrl({
        operation,
        key,
        mimeType,
      });

      return { signedUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSignedUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public replaceImageMimeTypeForImage<T extends ImageEntity>(params: ReplaceImageMimeTypeForImageInput<T>): ReplaceImageMimeTypeForImageOutput<T> {
    try {
      this.loggerService.trace("replaceImageMimeTypeForImage called", { params }, this.constructor.name);

      const { entityType, entity } = params;

      const { signedUrl } = this.getSignedUrl({
        operation: FileOperation.Get,
        entityType,
        entityId: entity.id,
        mimeType: entity.imageMimeType,
      });

      const { imageMimeType, ...restOfEntity } = entity;

      const entityWithImage = {
        ...restOfEntity,
        image: signedUrl,
      };

      return { entity: entityWithImage };
    } catch (error: unknown) {
      this.loggerService.error("Error in replaceImageMimeTypeForImage", { error }, this.constructor.name);

      throw error;
    }
  }

  private createKey(params: CreateKeyInput): CreateKeyOutput {
    try {
      this.loggerService.trace("createKey called", { params }, this.constructor.name);

      const { entityType, entityId, mimeType } = params;

      const fileExtension = this.mimeTypeToFileExtensionMap[mimeType];

      const fileDirectory = this.entityTypeToDirectoryMap[entityType];

      const key = `${fileDirectory}/${entityId}.${fileExtension}`;

      return { key };
    } catch (error: unknown) {
      this.loggerService.error("Error in createKey", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ImageFileRepositoryInterface {
  createDefaultImage(): CreateDefaultImageOutput;
  uploadFile(params: UploadFileInput): Promise<UploadFileOutput>;
  getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
  replaceImageMimeTypeForImage<T extends ImageEntity>(params: ReplaceImageMimeTypeForImageInput<T>): ReplaceImageMimeTypeForImageOutput<T>;
}

type ImageS3RepositoryConfig = Pick<EnvConfigInterface, "bucketNames">;

export type FileDirectory = "users" | "organizations" | "teams" | "groups" | "meetings";
export type FileExtension = "jpeg" | "bmp" | "png";
export type ImageEntityId = UserId | OrganizationId | TeamId | GroupId | MeetingId;
export type ImageEntityType = EntityType.User | EntityType.Organization | EntityType.Team | EntityType.Group | EntityType.Meeting;

export interface CreateDefaultImageOutput {
  image: Buffer;
  mimeType: ImageMimeType.Png;
}

interface UploadFileByIdAndMimeTypeInput {
  entityType: ImageEntityType;
  entityId: ImageEntityId;
  file: Buffer;
  mimeType: ImageMimeType;
}

export type UploadFileInput = BaseUploadFileInput | UploadFileByIdAndMimeTypeInput;
export type UploadFileOutput = BaseUploadFileOutput;

interface GetSignedUrlByIdAndMimeTypeInput {
  operation: FileOperation,
  entityType: ImageEntityType;
  entityId: ImageEntityId;
  mimeType: ImageMimeType;
}

export type GetSignedUrlInput = BaseGetSignedUrlInput | GetSignedUrlByIdAndMimeTypeInput;
export type GetSignedUrlOutput = BaseGetSignedUrlOutput;

export interface ImageEntity {
  imageMimeType: ImageMimeType;
  id: ImageEntityId;
}

export interface ReplaceImageMimeTypeForImageInput<T extends ImageEntity> {
  entityType: ImageEntityType;
  entity: T;
}

export interface ReplaceImageMimeTypeForImageOutput<T extends ImageEntity> {
  entity: Omit<T, "imageMimeType"> & { image: string; };
}

interface CreateKeyInput {
  entityType: ImageEntityType;
  entityId: ImageEntityId;
  mimeType: ImageMimeType;
}

interface CreateKeyOutput {
  key: string;
}
