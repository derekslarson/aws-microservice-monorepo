import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Crypto, CryptoFactory, FriendConvoId, Fs, FsFactory, GroupId, LoggerServiceInterface, MeetingId, MessageId, Path, PathFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { DirectoryIsFilledError } from "../errors/DirectoryIsFilled";
import { DirectoryExistError } from "../errors/DirectoryExists";

@injectable()
export class MessageEFSRepository implements MessageEFSRepositoryInterface {
  private crypto: Crypto;

  private fs: Fs;

  private path: Path;

  constructor(
    @inject(TYPES.EnvConfigInterface) private envConfig: MessageEFSRepositoryConfigInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
    @inject(TYPES.FsFactory) fsFactory: FsFactory,
    @inject(TYPES.PathFactory) pathFactory: PathFactory,
  ) {
    this.crypto = cryptoFactory();
    this.fs = fsFactory();
    this.path = pathFactory();
  }

  public async addMessageChunk(params: AddMessageChunkInput): Promise<void> {
    try {
      this.loggerService.trace("addMessageChunk called", { params }, this.constructor.name);

      const { conversationId, messageId, chunkData, chunkNumber } = params;

      const { path: absoluteDirectoryPath } = this.generateDirectoryPath({ conversationId, messageId });

      const dataBuffer = Buffer.from(chunkData, "base64");

      const absoluteChunkPath = this.path.join(absoluteDirectoryPath, `${chunkNumber}.tmp`);

      await this.fs.promises.writeFile(absoluteChunkPath, dataBuffer);
    } catch (error: unknown) {
      this.loggerService.error("Error in addMessageChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async getMessageFile(params: GetMediaMessageFileInput): Promise<GetMediaMessageFileOutput> {
    try {
      this.loggerService.trace("getMessageFile called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { path: absoluteDirectoryPath } = this.generateDirectoryPath({ conversationId, messageId });

      const chunkFileNames = await this.fs.promises.readdir(absoluteDirectoryPath, "utf-8");

      const writeBuffer = [];

      const sortedChunkFileNames = chunkFileNames.sort((a: string, b: string) => {
        const n1 = Number(a.replace(".tmp", ""));
        const n2 = Number(b.replace(".tmp", ""));

        return n1 - n2;
      });

      for await (const fileName of sortedChunkFileNames) {
        const fileData = await this.fs.promises.readFile(this.path.join(absoluteDirectoryPath, fileName));
        const normalizedData = Buffer.from(fileData.toString("base64"), "base64");
        writeBuffer.push(normalizedData);
      }

      const finalBuffer = Buffer.concat(writeBuffer);

      return {
        fileData: finalBuffer,
        checksum: this.crypto.createHash("sha256").update(finalBuffer).digest("base64"),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessageFile", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async readDirectory(params: ReadDirectoryInput): Promise<ReadDirectoryOutput> {
    try {
      this.loggerService.trace("readDirectory called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { path: absoluteDirectoryPath } = this.generateDirectoryPath({ conversationId, messageId });

      const chunks = await this.fs.promises.readdir(absoluteDirectoryPath);

      return { chunks };
    } catch (error: unknown) {
      this.loggerService.error("Error in readDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async createDirectoryIfNecessary(params: CreateDirectoryIfNecessaryInput): Promise<CreateDirectoryIfNecessaryOutput> {
    try {
      this.loggerService.trace("createDirectoryIfNecessary called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { path: absoluteDirectoryPath } = this.generateDirectoryPath({ conversationId, messageId });

      // check existence
      try {
        const dirItems = await this.fs.promises.readdir(absoluteDirectoryPath);

        if (dirItems && dirItems.length > 0) {
          throw new DirectoryIsFilledError();
        } else {
          throw new DirectoryExistError();
        }
      } catch (error: unknown) {
        if ((error as Record<string, string>).code === "ENOENT") {
          try {
            await this.fs.promises.mkdir(absoluteDirectoryPath);
          } catch (error2: unknown) {
            this.loggerService.info("error in createDirectory: Error in mkdir, gracefully continue", { error, params }, this.constructor.name);
          }
        }
      }
    } catch (error: unknown) {
      this.loggerService.error("error in createDirectoryIfNecessary", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async deleteDirectory(params: DeleteDirectoryInput): Promise<void> {
    try {
      this.loggerService.trace("deleteDirectory called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const { path: absoluteDirectoryPath } = this.generateDirectoryPath({ conversationId, messageId });

      await this.fs.rmfr(absoluteDirectoryPath);
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  private generateDirectoryPath(params: GenerateDirectoryPathInput): GenerateDirectoryPathOutput {
    try {
      this.loggerService.trace("generateDirectoryPath called", { params }, this.constructor.name);

      const { conversationId, messageId } = params;

      const dirName = `${conversationId}_${messageId}`;

      const path = this.path.resolve(__dirname, this.envConfig.fileSystemPath, dirName);

      return { path };
    } catch (error: unknown) {
      this.loggerService.error("Error in generateDirectoryPath", { error, params }, this.constructor.name);
      throw error;
    }
  }
}

export interface MessageEFSRepositoryInterface {
  deleteDirectory(params: DeleteDirectoryInput): Promise<void>,
  readDirectory(params: ReadDirectoryInput): Promise<ReadDirectoryOutput>,
  createDirectoryIfNecessary(params: CreateDirectoryIfNecessaryInput): Promise<CreateDirectoryIfNecessaryOutput>;
  addMessageChunk(params: AddMessageChunkInput): Promise<void>
  getMessageFile(params: GetMediaMessageFileInput): Promise<GetMediaMessageFileOutput>
}

type MessageEFSRepositoryConfigInterface = Pick<EnvConfigInterface, "fileSystemPath">;

interface AddMessageChunkInput {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
  chunkData: string;
  chunkNumber: number;
}

interface GetMediaMessageFileInput {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
}

interface GetMediaMessageFileOutput {
  fileData: Buffer;
  checksum: string;
}

interface CreateDirectoryIfNecessaryInput {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
}

type CreateDirectoryIfNecessaryOutput = void;

interface ReadDirectoryInput {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
}

interface ReadDirectoryOutput {
  chunks: string[];
}

interface DeleteDirectoryInput {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
}

interface GenerateDirectoryPathInput {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
}

interface GenerateDirectoryPathOutput {
  path: string;
}
