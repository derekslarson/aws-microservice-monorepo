import { inject, injectable } from "inversify";
import { LoggerServiceInterface, MessageS3RepositoryInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationId } from "../types/conversationId.type";
import { MessageId } from "../types/messageId.type";
import { MimeType } from "../enums/mimeType.enum";

@injectable()
export class MessageFileService implements MessageFileServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageS3RepositoryInterface) private messageS3Repository: MessageS3RepositoryInterface,
  ) {}

  public getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);

      const { messageId, conversationId, operation, mimeType } = params;

      const mimeTypeToFileExtensionMap: Record<MimeType, FileExtension> = {
        [MimeType.AudioMp3]: "mp3",
        [MimeType.AudioMp4]: "mp4",
        [MimeType.VideoMp4]: "mp4",
        [MimeType.VideoWebm]: "webm",
      };

      const fileExtension = mimeTypeToFileExtensionMap[mimeType];

      const key = `${conversationId}/${messageId}.${fileExtension}`;

      const { signedUrl } = this.messageS3Repository.getSignedUrl({
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

export interface MessageFileServiceInterface {
  getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput;
}

type FileExtension = "mp3" | "mp4" | "webm";
export interface GetSignedUrlInput {
  operation: "get" | "upload",
  messageId: MessageId;
  conversationId: ConversationId;
  mimeType: MimeType;
}

export interface GetSignedUrlOutput {
  signedUrl: string;
}
