import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { EntityType } from "../enums/entityType.enum";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { Identicon, IdenticonFactory } from "../factories/identicon.factory";

@injectable()
export class ImageFileService implements ImageFileServiceInterface {
  private identicon: Identicon;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.IdenticonFactory) identiconFactory: IdenticonFactory,
  ) {
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

  public async uploadFile(params: UploadFileInput): Promise<UploadFileOutput> {
    try {
      this.loggerService.trace("uploadFile called", { params }, this.constructor.name);

      const { entityType, entityId, file, mimeType } = params;

      const mimeTypeToFileExtensionMap: Record<ImageMimeType, FileExtension> = {
        [ImageMimeType.Jpeg]: "jpeg",
        [ImageMimeType.Bmp]: "bmp",
        [ImageMimeType.Png]: "png",
      };

      const entityTypeToDirectoryMap: Record<ImageEntityType, FileDirectory> = {
        [EntityType.User]: "users",
        [EntityType.Team]: "teams",
        [EntityType.GroupConversation]: "groups",
        [EntityType.MeetingConversation]: "meetings",
      };

      const fileExtension = mimeTypeToFileExtensionMap[mimeType];

      const fileDirectory = entityTypeToDirectoryMap[entityType];

      const key = `${fileDirectory}/${entityId}.${fileExtension}`;

      await this.imageFileRepository.uploadFile({
        key,
        body: file,
        contentType: mimeType,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in uploadFile", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);

      const { operation, entityType, entityId, mimeType } = params;

      const mimeTypeToFileExtensionMap: Record<ImageMimeType, FileExtension> = {
        [ImageMimeType.Jpeg]: "jpeg",
        [ImageMimeType.Bmp]: "bmp",
        [ImageMimeType.Png]: "png",
      };

      const entityTypeToDirectoryMap: Record<ImageEntityType, FileDirectory> = {
        [EntityType.User]: "users",
        [EntityType.Team]: "teams",
        [EntityType.GroupConversation]: "groups",
        [EntityType.MeetingConversation]: "meetings",
      };

      const fileExtension = mimeTypeToFileExtensionMap[mimeType];

      const fileDirectory = entityTypeToDirectoryMap[entityType];

      const key = `${fileDirectory}/${entityId}.${fileExtension}`;

      const { signedUrl } = this.imageFileRepository.getSignedUrl({
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
}

export interface ImageFileServiceInterface {
  createDefaultImage(): CreateDefaultImageOutput;
  uploadFile(params: UploadFileInput): Promise<UploadFileOutput>;
  getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
}

export type FileDirectory = "users" | "teams" | "groups" | "meetings";
export type FileExtension = "jpeg" | "bmp" | "png";

type ImageEntityId = UserId | TeamId | GroupId | MeetingId;
type ImageEntityType = EntityType.User | EntityType.Team | EntityType.GroupConversation | EntityType.MeetingConversation;

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
