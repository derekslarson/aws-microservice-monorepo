import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import { BaseS3Repository, GetSignedUrlOutput, HeadObjectOutput } from "./base.s3.repository";
import { S3Factory } from "../factories/s3.factory";
import { LoggerServiceInterface } from "../services/logger.service";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { MessageId } from "../api-contracts/types/messageId.type";
import { FriendConvoId } from "../api-contracts/types/friendConvoId.type";
import { GroupId } from "../api-contracts/types/groupId.type";
import { MeetingId } from "../api-contracts/types/meetingId.type";

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

  public getMessageSignedUrl(params: GetMessageSignedUrlInput): GetMessageSignedUrlOutput {
    try {
      this.loggerService.trace("getMessageSignedUrl called", { params }, this.constructor.name);

      const { messageId, conversationId, operation, mimeType } = params;

      const fileExtension = this.mimeTypeToFileExtensionMap[mimeType];

      const key = `${conversationId}/${messageId}.${fileExtension}`;

      if (operation === "get") {
        return super.getSignedUrl({
          operation: "getObject",
          key,
        });
      }

      return super.getSignedUrl({
        operation: "putObject",
        key,
        contentType: mimeType,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessageSignedUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getMessageSignedUrlByKey(params: GetMessageSignedUrlByKeyInput): GetMessageSignedUrlByKeyOutput {
    try {
      this.loggerService.trace("getMessageSignedUrl called", { params }, this.constructor.name);

      if (params.operation === "get") {
        return super.getSignedUrl({
          operation: "getObject",
          key: params.key,
        });
      }

      return super.getSignedUrl({
        operation: "putObject",
        key: params.key,
        contentType: params.mimeType,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessageSignedUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public messageHeadObject(params: MessageHeadObjectInput): Promise<MessageHeadObjectOutput> {
    try {
      this.loggerService.trace("messageHeadObject called", { params }, this.constructor.name);

      const { messageId, conversationId, mimeType } = params;

      const fileExtension = this.mimeTypeToFileExtensionMap[mimeType];

      const key = `${conversationId}/${messageId}.${fileExtension}`;

      return super.headObject({ key });
    } catch (error: unknown) {
      this.loggerService.error("Error in messageHeadObject", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public messageHeadObjectByKey(params: MessageHeadObjectByKeyInput): Promise<MessageHeadObjectByKeyOutput> {
    try {
      this.loggerService.trace("messageHeadObjectByKey called", { params }, this.constructor.name);

      const { key } = params;

      return super.headObject({ key });
    } catch (error: unknown) {
      this.loggerService.error("Error in messageHeadObjectByKey", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public createKey(params: CreateKeyInput): CreateKeyOutput {
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

  public parseKey(params: ParseKeyInput): ParseKeyOutput {
    try {
      this.loggerService.trace("parseKey called", { params }, this.constructor.name);

      const { key } = params;

      const [ conversationId, messageIdWithExtension ] = key.split("/");
      const [ messageId, extension ] = messageIdWithExtension.split(".");

      return {
        conversationId: conversationId as FriendConvoId | GroupId | MeetingId,
        messageId: messageId as MessageId,
        extension: extension as FileExtension,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in parseKey", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageFileRepositoryInterface {
  getMessageSignedUrl(params: GetMessageSignedUrlInput): GetMessageSignedUrlOutput;
  getMessageSignedUrlByKey(params: GetMessageSignedUrlByKeyInput): GetMessageSignedUrlByKeyOutput;
  messageHeadObject(params: MessageHeadObjectInput): Promise<MessageHeadObjectOutput>;
  messageHeadObjectByKey(params: MessageHeadObjectByKeyInput): Promise<MessageHeadObjectByKeyOutput>;
  createKey(params: CreateKeyInput): CreateKeyOutput;
  parseKey(params: ParseKeyInput): ParseKeyOutput;
}

export type FileExtension = "mp3" | "mp4" | "webm";

export interface GetMessageSignedUrlInput {
  operation: "get" | "upload",
  messageId: MessageId;
  conversationId: FriendConvoId | GroupId | MeetingId;
  mimeType: MessageMimeType;
}

export type GetMessageSignedUrlOutput = GetSignedUrlOutput;

export type GetMessageSignedUrlByKeyInput = GetMessageSignedUrlByKeyGetInput | GetMessageSignedUrlByKeyUploadInput;

export type GetMessageSignedUrlByKeyOutput = GetSignedUrlOutput;

export interface MessageHeadObjectInput {
  messageId: MessageId;
  conversationId: FriendConvoId | GroupId | MeetingId;
  mimeType: MessageMimeType;
}

export type MessageHeadObjectOutput = HeadObjectOutput;

export interface MessageHeadObjectByKeyInput {
  key: string;
}

export type MessageHeadObjectByKeyOutput = HeadObjectOutput;

export interface CreateKeyInput {
  messageId: MessageId;
  conversationId: FriendConvoId | GroupId | MeetingId;
  mimeType: MessageMimeType;
}

export interface CreateKeyOutput {
  key: string;
}

export interface ParseKeyInput {
  key: string;
}

export interface ParseKeyOutput {
  messageId: MessageId;
  conversationId: FriendConvoId | GroupId | MeetingId;
  extension: FileExtension;
}

interface BaseGetMessageSignedUrlByKeyInput {
  key: string;
}

interface GetMessageSignedUrlByKeyGetInput extends BaseGetMessageSignedUrlByKeyInput {
  operation: "get"
}

interface GetMessageSignedUrlByKeyUploadInput extends BaseGetMessageSignedUrlByKeyInput {
  operation: "upload";
  mimeType: MessageMimeType;
}
