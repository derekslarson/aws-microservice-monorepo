import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Crypto, CryptoFactory, Fs, FsFactory, LoggerServiceInterface, Path, PathFactory } from "@yac/util";
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

      const { path, chunkData, chunkNumber } = params;

      const dataBuffer = Buffer.from(chunkData, "base64");

      const dir = this.path.resolve(__dirname, path, `${chunkNumber}.tmp`);

      await this.fs.promises.writeFile(dir, dataBuffer);
    } catch (error: unknown) {
      this.loggerService.error("Error in addMessageChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async getMessageFile(params: GetMediaMessageFileInput): Promise<GetMediaMessageFileOutput> {
    try {
      this.loggerService.trace("getMessageFile called", { params }, this.constructor.name);

      const { path, name } = params;

      const dir = this.path.resolve(__dirname, path);

      const fileNames = await this.fs.promises.readdir(dir, "utf-8");

      const writeBuffer = [];

      const arrangedFileNames = fileNames.sort((a: string, b: string) => {
        const n1 = Number(a.replace(".tmp", ""));
        const n2 = Number(b.replace(".tmp", ""));

        return n1 - n2;
      });

      for await (const fileName of arrangedFileNames) {
        if (fileName) {
          const fileData = await this.fs.promises.readFile(this.path.join(dir, fileName));
          const normalizedData = Buffer.from(fileData.toString("base64"), "base64");
          writeBuffer.push(normalizedData);
        }
      }

      const finalBuffer = Buffer.concat(writeBuffer);

      return {
        path,
        name,
        fileData: finalBuffer,
        meta: {
          chunks: fileNames.length,
          checksum: this.crypto.createHash("sha256").update(finalBuffer).digest("base64"),
        },
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessageFile", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async readDirectory(params: ReadDirectoryInput): Promise<ReadDirectoryOutput> {
    try {
      this.loggerService.trace("readDirectory called", { params }, this.constructor.name);

      const { name } = params;

      const dir = this.path.resolve(__dirname, this.envConfig.fileSystemPath, name);

      const dirItems = await this.fs.promises.readdir(dir);

      if (!dirItems || (dirItems && dirItems.length <= 0)) {
        return {
          name,
          path: dir,
        };
      }

      return {
        name,
        path: dir,
        children: dirItems,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in readDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async makeDirectory(params: MakeDirectoryInput): Promise<MakeDirectoryOutput> {
    try {
      this.loggerService.trace("makeDirectory called", { params }, this.constructor.name);

      const { name } = params;

      const dir = this.path.resolve(__dirname, this.envConfig.fileSystemPath, name);

      // check existence
      try {
        const dirItems = await this.fs.promises.readdir(dir);

        if (dirItems && dirItems.length > 0) {
          throw new DirectoryIsFilledError();
        } else {
          throw new DirectoryExistError();
        }
      } catch (error: unknown) {
        if ((error as Record<string, string>).code === "ENOENT") {
          try {
            await this.fs.promises.mkdir(dir);
          } catch (error2: unknown) {
            this.loggerService.info("error in makeDirectory: Error in mkdir, gracefully continue", { error, params }, this.constructor.name);
          }
        }
      }

      return {
        name,
        path: dir,
      };
    } catch (error: unknown) {
      this.loggerService.error("error in makeDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async deleteDirectory(params: DeleteDirectoryInput): Promise<void> {
    try {
      this.loggerService.trace("deleteDirectory called", { params }, this.constructor.name);

      const { name } = params;

      const dir = this.path.resolve(__dirname, this.envConfig.fileSystemPath, name);

      await this.fs.rmfr(dir);
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }
}

export interface MessageEFSRepositoryInterface {
  deleteDirectory(params: DeleteDirectoryInput): Promise<void>,
  readDirectory(params: ReadDirectoryInput): Promise<ReadDirectoryOutput>,
  makeDirectory(params: MakeDirectoryInput): Promise<MakeDirectoryOutput>,
  addMessageChunk(params: AddMessageChunkInput): Promise<void>
  getMessageFile(params: GetMediaMessageFileInput): Promise<GetMediaMessageFileOutput>
}

type MessageEFSRepositoryConfigInterface = Pick<EnvConfigInterface, "fileSystemPath">;

interface AddMessageChunkInput {
  chunkData: string,
  chunkNumber: number,
  path: string
}

interface GetMediaMessageFileInput {
  path: string,
  name: string,
  format: string
}

interface GetMediaMessageFileOutput {
  name: string,
  path: string,
  fileData: Buffer,
  meta: {
    chunks: number,
    checksum: string
  }
}

interface MakeDirectoryInput {
  name: string
}

interface MakeDirectoryOutput {
  path: string,
  name: string
}

interface ReadDirectoryInput {
  name: string
}

interface ReadDirectoryOutput {
  path: string,
  name: string,
  children?: string[]
}

interface DeleteDirectoryInput {
  name: string
}
