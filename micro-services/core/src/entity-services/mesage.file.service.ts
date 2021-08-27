import { inject, injectable } from "inversify";
import { EnhancedMessageFileRepositoryInterface, LoggerServiceInterface, RawMessageFileRepositoryInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ConversationId } from "../types/conversationId.type";
import { MessageId } from "../types/messageId.type";
import { MessageMimeType } from "../enums/message.mimeType.enum";

@injectable()
export class MessageFileService implements MessageFileServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.RawMessageFileRepositoryInterface) private rawMessageFileRepository: RawMessageFileRepositoryInterface,
    @inject(TYPES.EnhancedMessageFileRepositoryInterface) private enhancedMessageFileRepository: EnhancedMessageFileRepositoryInterface,
  ) {}

  public getSignedUrl(params: GetSignedUrlInput): GetSignedUrlOutput {
    try {
      this.loggerService.trace("getSignedUrl called", { params }, this.constructor.name);

      const { messageId, conversationId, operation, mimeType } = params;

      const mimeTypeToFileExtensionMap: Record<MessageMimeType, FileExtension> = {
        [MessageMimeType.AudioMp3]: "mp3",
        [MessageMimeType.AudioMp4]: "mp4",
        [MessageMimeType.VideoMp4]: "mp4",
        [MessageMimeType.VideoWebm]: "webm",
      };

      const fileExtension = mimeTypeToFileExtensionMap[mimeType];

      const key = `${conversationId}/${messageId}.${fileExtension}`;

      let signedUrl: string;

      if (operation === "get") {
        ({ signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
          operation: "getObject",
          key,
        }));
      } else {
        ({ signedUrl } = this.rawMessageFileRepository.getSignedUrl({
          operation: "putObject",
          key,
          contentType: mimeType,
        }));
      }

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
  mimeType: MessageMimeType;
}

export interface GetSignedUrlOutput {
  signedUrl: string;
}
