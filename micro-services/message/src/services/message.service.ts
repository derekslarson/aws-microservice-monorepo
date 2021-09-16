import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BadRequestError, LoggerServiceInterface, Message } from "@yac/util";

import { SHA256 } from "crypto-js";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { MessageEFSRepositoryInterface } from "../repositories/message.efs.repository";
import { MessageS3RepositoryInterface } from "../repositories/message.s3.repository";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageEFSRepository) private messageEFSRepository: MessageEFSRepositoryInterface,
    @inject(TYPES.MessageS3Repository) private messageS3Repository: MessageS3RepositoryInterface,
  ) { }

  public async processChunk(params: ProcessChunkInput): Promise<void> {
    try {
      this.loggerService.trace("called processChunk ", { params }, this.constructor.name);

      const dir = await this.messageEFSRepository.makeDirectory({ name: params.messageId });
      this.messageEFSRepository.addMessageChunk({ path: dir.path, chunkData: params.chunkData });
    } catch (error: unknown) {
      this.loggerService.error("failed to processChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async saveMessage(params: SaveMessageInput): Promise<SaveMessageOutput> {
    try {
      this.loggerService.trace("called processChunk ", { params }, this.constructor.name);
      const fileDirectoryContent = await this.messageEFSRepository.readDirectory({ name: params.messageId });

      if (fileDirectoryContent?.children && (fileDirectoryContent.children.length < params.totalChunks)) {
        await this.messageEFSRepository.deleteDirectory({ name: params.messageId });
        throw new BadRequestError("File on server is incomplete, try uploading again");
      } else if (fileDirectoryContent?.children && (fileDirectoryContent.children.length > params.totalChunks)) {
        await this.messageEFSRepository.deleteDirectory({ name: params.messageId });
        throw new BadRequestError("File on server is larger, try uploading again");
      }

      const finalFile = await this.messageEFSRepository.getMessageFile({ name: params.messageId, path: fileDirectoryContent.path });

      if (finalFile.meta.checksum !== params.checksum) {
        // TODO: continue here
        // if checksum is different throw error
      }

      const dir = await this.messageEFSRepository.makeDirectory({ name: params.messageId });
      this.messageEFSRepository.addMessageChunk({ path: dir.path, chunkData: params.chunkData });
    } catch (error: unknown) {
      this.loggerService.error("failed to processChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }
}

export interface MessageServiceInterface {
  processChunk(params: ProcessChunkInput): Promise<void>
  saveMessage(params: SaveMessageInput): Promise<SaveMessageOutput>
}

interface ProcessChunkInput {
  messageId : Message["id"],
  chunkData: string
}

interface SaveMessageInput {
  messageId: Message["id"],
  totalChunks: number,
  checksum: string,
  chunkData: string
}

interface SaveMessageOutput {
  url: string,
  messageId: Message["id"]
}
