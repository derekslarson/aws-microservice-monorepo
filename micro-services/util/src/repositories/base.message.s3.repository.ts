import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import {
  BaseS3Repository,
  GetSignedUrlInput,
  HeadObjectInput,
  GetSignedUrlOutput,
  HeadObjectOutput,
  UploadFileInput,
  UploadFileOutput,
} from "./base.s3.repository";
import { S3Factory } from "../factories/s3.factory";
import { LoggerServiceInterface } from "../services/logger.service";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { MessageId } from "../types/messageId.type";
import { OneOnOneId } from "../types/oneOnOneId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { FileOperation } from "../enums/fileOperation.enum";

@injectable()
export abstract class BaseMessageS3Repository extends BaseS3Repository implements MessageFileRepositoryInterface {
  private readonly mimeTypeToFileExtensionMap: Record<MessageMimeType, FileExtension> = {
    [MessageMimeType.AudioMp3]: "mp3",
    [MessageMimeType.AudioMp4]: "mp4",
    [MessageMimeType.VideoMp4]: "mp4",
    [MessageMimeType.VideoWebm]: "webm",
  };

  constructor(
  @unmanaged() bucketName: string,
    @unmanaged() s3Factory: S3Factory,
    @unmanaged() loggerService: LoggerServiceInterface,
  ) {
    super(bucketName, s3Factory, loggerService);
  }

  public override uploadFile(params: UploadFileInput): Promise<UploadFileOutput> {
    try {
      this.loggerService.trace("uploadFile called", { params }, this.constructor.name);

      return super.uploadFile(params);
    } catch (error: unknown) {
      this.loggerService.error("Error in uploadFile", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public override getSignedUrl(params: MessageGetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);

      if ("key" in params) {
        return super.getSignedUrl(params);
      }

      const { messageId, conversationId, operation, mimeType } = params;

      const { key } = this.createKey({ messageId, conversationId, mimeType });

      if (operation === FileOperation.Get) {
        return super.getSignedUrl({ operation, key });
      }

      return super.getSignedUrl({ operation, key, mimeType });
    } catch (error: unknown) {
      this.loggerService.error("Error in getSignedUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public override headObject(params: MessageHeadObjectInput): Promise<HeadObjectOutput> {
    try {
      this.loggerService.trace("headObject called", { params }, this.constructor.name);

      if ("key" in params) {
        return super.headObject(params);
      }

      const { messageId, conversationId, mimeType } = params;

      const { key } = this.createKey({ messageId, conversationId, mimeType });

      return super.headObject({ key });
    } catch (error: unknown) {
      this.loggerService.error("Error in headObject", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private createKey(params: CreateKeyInput): CreateKeyOutput {
    try {
      this.loggerService.trace("createKey called", { params }, this.constructor.name);

      const { messageId, conversationId, mimeType } = params;

      const fileExtension = this.mimeTypeToFileExtensionMap[mimeType];

      const key = `${conversationId}/${messageId}.${fileExtension}`;

      return { key };
    } catch (error: unknown) {
      this.loggerService.error("Error in createKey", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageFileRepositoryInterface {
  uploadFile(params: UploadFileInput): Promise<UploadFileOutput>;
  getSignedUrl(params: MessageGetSignedUrlInput): GetSignedUrlOutput;
  headObject(params: MessageHeadObjectInput): Promise<HeadObjectOutput>;
}

export type FileExtension = "mp3" | "mp4" | "webm";

interface GetSignedUrlByIdAndMimeTypeInput {
  operation: FileOperation,
  messageId: MessageId;
  conversationId: OneOnOneId | GroupId | MeetingId;
  mimeType: MessageMimeType;
}

export type MessageGetSignedUrlInput = GetSignedUrlInput | GetSignedUrlByIdAndMimeTypeInput;

interface HeadObjectByIdAndMimeTypeInput {
  messageId: MessageId;
  conversationId: OneOnOneId | GroupId | MeetingId;
  mimeType: MessageMimeType;
}

export type MessageHeadObjectInput = HeadObjectInput | HeadObjectByIdAndMimeTypeInput;

interface CreateKeyInput {
  messageId: MessageId;
  conversationId: OneOnOneId | GroupId | MeetingId;
  mimeType: MessageMimeType;
}

interface CreateKeyOutput {
  key: string;
}
