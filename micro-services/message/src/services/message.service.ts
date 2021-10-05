import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BadRequestError, LoggerServiceInterface, MessageMimeType, MessageFileRepositoryInterface, MessageId, FriendConvoId, MeetingId, GroupId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MessageEFSRepositoryInterface } from "../repositories/message.efs.repository";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageEFSRepository) private messageEFSRepository: MessageEFSRepositoryInterface,
    @inject(TYPES.RawMessageFileRepositoryInterface) private rawMessageFileRepository: MessageFileRepositoryInterface,
  ) { }

  public async processChunk(params: ProcessChunkInput): Promise<void> {
    try {
      this.loggerService.trace("processChunk called", { params }, this.constructor.name);

      const { conversationId, messageId, chunkData, chunkNumber } = params;

      await this.messageEFSRepository.createDirectoryIfNecessary({ conversationId, messageId });

      await this.messageEFSRepository.addMessageChunk({ conversationId, messageId, chunkData, chunkNumber });
    } catch (error: unknown) {
      this.loggerService.error("Error in processChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async saveMessage(params: SaveMessageInput): Promise<SaveMessageOutput> {
    try {
      this.loggerService.trace("saveMessage called", { params }, this.constructor.name);

      const { conversationId, messageId, mimeType, totalChunks, checksum } = params;

      const { chunks: serverChunks } = await this.messageEFSRepository.readDirectory({ conversationId, messageId });

      this.loggerService.info("chunk info", { serverChunks: serverChunks.length, totalChunks }, this.constructor.name);

      if (serverChunks.length < totalChunks) {
        await this.messageEFSRepository.deleteDirectory({ conversationId, messageId });

        throw new BadRequestError("File on server is incomplete, try uploading again");
      }

      if (serverChunks.length > totalChunks) {
        await this.messageEFSRepository.deleteDirectory({ conversationId, messageId });

        throw new BadRequestError("File on server is larger, try uploading again");
      }

      const { fileData, checksum: serverChecksum } = await this.messageEFSRepository.getMessageFile({ conversationId, messageId });

      if (serverChecksum !== checksum) {
        await this.messageEFSRepository.deleteDirectory({ conversationId, messageId });

        throw new BadRequestError("File checksum on server is different than provided by client");
      }

      const key = `${conversationId}/${messageId}`;

      // upload to s3
      await this.rawMessageFileRepository.uploadFile({
        body: fileData,
        mimeType,
        key,
      });

      await this.messageEFSRepository.deleteDirectory({ conversationId, messageId });
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
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
  chunkData: string;
  chunkNumber: number;
}

interface SaveMessageInput {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
  totalChunks: number;
  checksum: string;
  mimeType: MessageMimeType;
}

type SaveMessageOutput = void;
