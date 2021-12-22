import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MessageId } from "@yac/util/src/types/messageId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { MeetingId } from "@yac/util/src/types/meetingId.type";
import { MessageFileRepositoryInterface } from "@yac/util/src/repositories/base.message.s3.repository";
import { OneOnOneId } from "@yac/util/src/types/oneOnOneId.type";
import { MessageMimeType } from "@yac/util/src/enums/message.mimeType.enum";
import { BadRequestError } from "@yac/util/src/errors/badRequest.error";
import { FileOperation } from "@yac/util/src/enums/fileOperation.enum";
import { TYPES } from "../inversion-of-control/types";
import { MessageFileSystemRepositoryInterface } from "../repositories/message.efs.repository";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageFileSystemRepositoryInterface) private messageFileSystemRepository: MessageFileSystemRepositoryInterface,
    @inject(TYPES.RawMessageFileRepositoryInterface) private rawMessageFileRepository: MessageFileRepositoryInterface,
  ) { }

  public async processChunk(params: ProcessChunkInput): Promise<void> {
    try {
      this.loggerService.trace("processChunk called", { params }, this.constructor.name);

      const { conversationId, messageId, chunkData, chunkNumber } = params;

      await this.messageFileSystemRepository.upsertMessageDirectory({ conversationId, messageId });

      await this.messageFileSystemRepository.addMessageChunk({ conversationId, messageId, chunkData, chunkNumber });
    } catch (error: unknown) {
      this.loggerService.error("Error in processChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async saveMessage(params: SaveMessageInput): Promise<SaveMessageOutput> {
    try {
      this.loggerService.trace("saveMessage called", { params }, this.constructor.name);

      const { conversationId, messageId, mimeType, totalChunks, checksum } = params;

      const { fileNames } = await this.messageFileSystemRepository.readMessageDirectory({ conversationId, messageId });

      if (fileNames.length < totalChunks) {
        await this.messageFileSystemRepository.deleteMessageDirectory({ conversationId, messageId });

        throw new BadRequestError("File on server is incomplete, try uploading again");
      }

      if (fileNames.length > totalChunks) {
        await this.messageFileSystemRepository.deleteMessageDirectory({ conversationId, messageId });

        throw new BadRequestError("File on server is larger, try uploading again");
      }

      const { file, checksum: serverChecksum } = await this.messageFileSystemRepository.getMessageFile({ conversationId, messageId });

      if (serverChecksum !== checksum) {
        await this.messageFileSystemRepository.deleteMessageDirectory({ conversationId, messageId });

        throw new BadRequestError("File checksum on server is different than provided by client");
      }

      const key = `${conversationId}/${messageId}`;

      await Promise.all([
        this.rawMessageFileRepository.uploadFile({ body: file, mimeType, key }),
        this.messageFileSystemRepository.deleteMessageDirectory({ conversationId, messageId }),
      ]);

      const { signedUrl } = this.rawMessageFileRepository.getSignedUrl({ operation: FileOperation.Get, conversationId, messageId, mimeType });

      return { fetchUrl: signedUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in saveMessage", { error, params }, this.constructor.name);
      throw error;
    }
  }
}

export interface MessageServiceInterface {
  processChunk(params: ProcessChunkInput): Promise<void>
  saveMessage(params: SaveMessageInput): Promise<SaveMessageOutput>
}

interface ProcessChunkInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
  chunkData: string;
  chunkNumber: number;
}

interface SaveMessageInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
  totalChunks: number;
  checksum: string;
  mimeType: MessageMimeType;
}

interface SaveMessageOutput {
  fetchUrl: string;
}
