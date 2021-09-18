import "reflect-metadata";
import { BaseS3Repository, IdServiceInterface, LoggerServiceInterface, S3Factory } from "@yac/util";
import { injectable, inject } from "inversify";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { ImageMimeType } from "../enums/image.mimeType.enum";

/* eslint-disable @typescript-eslint/naming-convention */
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { EntityType } from "../enums/entityType.enum";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
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
    [EntityType.Team]: "teams",
    [EntityType.GroupConversation]: "groups",
    [EntityType.MeetingConversation]: "meetings",
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

  public async uploadImageFile(params: UploadFileInput): Promise<UploadFileOutput> {
    try {
      this.loggerService.trace("uploadFile called", { params }, this.constructor.name);

      const { entityType, entityId, file, mimeType } = params;

      const fileExtension = this.mimeTypeToFileExtensionMap[mimeType];

      const fileDirectory = this.entityTypeToDirectoryMap[entityType];

      const key = `${fileDirectory}/${entityId}.${fileExtension}`;

      await this.uploadFile({
        key,
        body: file,
        contentType: mimeType,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in uploadFile", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getImageSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);

      const { operation, entityType, entityId, mimeType } = params;

      const fileExtension = this.mimeTypeToFileExtensionMap[mimeType];

      const fileDirectory = this.entityTypeToDirectoryMap[entityType];

      const key = `${fileDirectory}/${entityId}.${fileExtension}`;

      const { signedUrl } = this.getSignedUrl({
        operation: operation === "get" ? "getObject" : "putObject",
        key,
        contentType: mimeType,
      });

      return { signedUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSignedUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public replaceImageMimeTypeForImage<T extends ImageEntity>(params: ReplaceImageMimeTypeForImageInput<T>): ReplaceImageMimeTypeForImageOutput<T> {
    try {
      this.loggerService.trace("replaceImageMimeTypeForImage called", {}, this.constructor.name);

      const { entityType, entity } = params;

      const { signedUrl } = this.getImageSignedUrl({
        operation: "get",
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
}

export interface ImageFileRepositoryInterface {
  createDefaultImage(): CreateDefaultImageOutput;
  uploadImageFile(params: UploadFileInput): Promise<UploadFileOutput>;
  getImageSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
  replaceImageMimeTypeForImage<T extends ImageEntity>(params: ReplaceImageMimeTypeForImageInput<T>): ReplaceImageMimeTypeForImageOutput<T>;
}

type ImageS3RepositoryConfig = Pick<EnvConfigInterface, "bucketNames">;

export type FileDirectory = "users" | "teams" | "groups" | "meetings";
export type FileExtension = "jpeg" | "bmp" | "png";
export type ImageEntityId = UserId | TeamId | GroupId | MeetingId;
export type ImageEntityType = EntityType.User | EntityType.Team | EntityType.GroupConversation | EntityType.MeetingConversation;

export interface CreateDefaultImageOutput {
  image: Buffer;
  mimeType: ImageMimeType.Png;
}

export interface UploadFileInput {
  entityType: ImageEntityType;
  entityId: ImageEntityId;
  file: Buffer;
  mimeType: ImageMimeType;
}

export type UploadFileOutput = void;

export interface GetSignedUrlInput {
  operation: "get" | "upload",
  entityType: ImageEntityType;
  entityId: ImageEntityId;
  mimeType: ImageMimeType;
}

export interface GetSignedUrlOutput {
  signedUrl: string;
}

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
