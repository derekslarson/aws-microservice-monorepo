import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseEfsRepository } from "@yac/util/src/repositories/base.efs.repository";
import { Crypto, CryptoFactory } from "@yac/util/src/factories/crypto.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { FsFactory } from "@yac/util/src/factories/fs.factory";
import { PathFactory } from "@yac/util/src/factories/path.factory";
import { MessageId } from "@yac/util/src/types/messageId.type";
import { OneOnOneId } from "@yac/util/src/types/oneOnOneId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { MeetingId } from "@yac/util/src/types/meetingId.type";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class MessageEfsRepository extends BaseEfsRepository implements MessageFileSystemRepositoryInterface {
  private crypto: Crypto;

  constructor(
  @inject(TYPES.EnvConfigInterface) config: MessageEFSRepositoryConfigInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.FsFactory) fsFactory: FsFactory,
    @inject(TYPES.PathFactory) pathFactory: PathFactory,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
  ) {
    super(loggerService, config.fileSystemPath, fsFactory, pathFactory);

    this.crypto = cryptoFactory();
  }

  public async addMessageChunk(params: AddMessageChunkInput): Promise<void> {
    try {
      this.loggerService.trace("addMessageChunk called", { params }, this.constructor.name);

      const { conversationId, messageId, chunkData, chunkNumber } = params;

      const { directoryName } = this.generateDirectoryName({ conversationId, messageId });

      const file = Buffer.from(chunkData, "base64");

      const path = `${directoryName}/${chunkNumber}.tmp`;

      await this.writeFile({ path, file });
    } catch (error: unknown) {
      this.loggerService.error("Error in addMessageChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async getMessageFile(params: GetMediaMessageFileInput): Promise<GetMediaMessageFileOutput> {
    try {
      this.loggerService.trace("getMessageFile called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { directoryName } = this.generateDirectoryName({ conversationId, messageId });

      const { fileNames } = await this.readDirectory({ path: directoryName });

      const sortedFileNames = fileNames.sort((a: string, b: string) => Number(a.replace(".tmp", "")) - Number(b.replace(".tmp", "")));

      const chunkBuffers = [];

      for await (const fileName of sortedFileNames) {
        const chunkFilePath = `${directoryName}/${fileName}`;

        const { file } = await this.readFile({ path: chunkFilePath });

        chunkBuffers.push(file);
      }

      const file = Buffer.concat(chunkBuffers);

      return {
        file,
        checksum: this.crypto.createHash("sha256").update(file).digest("base64"),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessageFile", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async readMessageDirectory(params: ReadMessageDirectoryInput): Promise<ReadMessageDirectoryOutput> {
    try {
      this.loggerService.trace("readMessageDirectory called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { directoryName } = this.generateDirectoryName({ conversationId, messageId });

      const { fileNames } = await this.readDirectory({ path: directoryName });

      return { fileNames };
    } catch (error: unknown) {
      this.loggerService.error("error in readMessageDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async upsertMessageDirectory(params: UpsertMessageDirectoryInput): Promise<UpsertMessageDirectoryOutput> {
    try {
      this.loggerService.trace("upsertMessageDirectory called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { directoryName } = this.generateDirectoryName({ conversationId, messageId });

      await this.upsertDirectory({ path: directoryName });
    } catch (error: unknown) {
      this.loggerService.error("error in upsertMessageDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async deleteMessageDirectory(params: DeleteMessageDirectoryInput): Promise<void> {
    try {
      this.loggerService.trace("deleteMessageDirectory called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { directoryName } = this.generateDirectoryName({ conversationId, messageId });

      await this.deleteDirectory({ path: directoryName });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteMessageDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  private generateDirectoryName(params: GenerateDirectoryNameInput): GenerateDirectoryNameOutput {
    try {
      this.loggerService.trace("generateDirectoryName called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const directoryName = `${conversationId}_${messageId}`;

      return { directoryName };
    } catch (error: unknown) {
      this.loggerService.error("Error in generateDirectoryName", { error, params }, this.constructor.name);
      throw error;
    }
  }
}

export interface MessageFileSystemRepositoryInterface {
  readMessageDirectory(params: ReadMessageDirectoryInput): Promise<ReadMessageDirectoryOutput>;
  deleteMessageDirectory(params: DeleteMessageDirectoryInput): Promise<void>;
  upsertMessageDirectory(params: UpsertMessageDirectoryInput): Promise<UpsertMessageDirectoryOutput>;
  addMessageChunk(params: AddMessageChunkInput): Promise<void>;
  getMessageFile(params: GetMediaMessageFileInput): Promise<GetMediaMessageFileOutput>;
}

type MessageEFSRepositoryConfigInterface = Pick<EnvConfigInterface, "fileSystemPath">;

interface AddMessageChunkInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
  chunkData: string;
  chunkNumber: number;
}

interface GetMediaMessageFileInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
}

interface GetMediaMessageFileOutput {
  file: Buffer;
  checksum: string;
}

interface ReadMessageDirectoryInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
}

interface ReadMessageDirectoryOutput {
  fileNames: string[];
}

interface UpsertMessageDirectoryInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
}

type UpsertMessageDirectoryOutput = void;

interface DeleteMessageDirectoryInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
}

interface GenerateDirectoryNameInput {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
}

interface GenerateDirectoryNameOutput {
  directoryName: string;
}
