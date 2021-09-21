import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { SHA256 } from "crypto-js";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { DirectoryIsFilledError } from "../errors/DirectoryIsFilled";
import { DirectoryExistError } from "../errors/DirectoryExists";

@injectable()
export class MessageEFSRepository implements MessageEFSRepositoryInterface {
  constructor(
    @inject(TYPES.EnvConfigInterface) private envConfig: MessageEFSRepositoryConfigInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
  }

  public addMessageChunk(params: AddMessageChunkInput): void {
    try {
      this.loggerService.trace("called addMessageChunk", { params }, this.constructor.name);
      const dataBuffer = Buffer.from(params.chunkData, "base64");
      const dir = this.chunkFilePath(params.path, params.chunkNumber);
      const fileStream = fs.createWriteStream(dir);

      fileStream.write(dataBuffer);
    } catch (error: unknown) {
      this.loggerService.error("failed to addMessageChunk", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async getMessageFile(params: GetMediaMessageFileInput): Promise<GetMediaMessageFileOutput> {
    try {
      this.loggerService.trace("called getMessageFile", { params }, this.constructor.name);

      const dir = path.resolve(__dirname, params.path);
      const files = await fs.promises.readdir(dir, "utf-8");
      const finalBuffer = fs.createWriteStream(path.join(dir, `${params.name}_final.tbd`), { flags: "a" });

      const arrangedFileNames = files.sort((a, b) => {
        const n1 = Number((a as string).replace(".tmp", ""));
        const n2 = Number((b as string).replace(".tmp", ""));

        return n1 - n2;
      });

      for await (const fileName of arrangedFileNames) {
        if (fileName) {
          const fileData = await fs.promises.readFile(path.join(dir, `${fileName as string}`));
          finalBuffer.write(fileData);
        }
      }

      return {
        path: params.path,
        name: params.name,
        fileData: finalBuffer,
        meta: {
          chunks: files.length,
          checksum: SHA256(finalBuffer.toString()).toString(),
        },
      };
    } catch (error: unknown) {
      this.loggerService.error("failed to getMessageFile", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async readDirectory(params: ReadDirectoryInput): Promise<ReadDirectoryOutput> {
    try {
      this.loggerService.trace("called readDirectory", { params }, this.constructor.name);
      const dir = path.resolve(__dirname, this.envConfig.fileSystemPath, params.name);

      const dirItems = await fs.promises.readdir(dir);

      if (!dirItems || (dirItems && dirItems.length <= 0)) {
        return {
          name: params.name,
          path: dir,
        };
      }

      return {
        name: params.name,
        path: dir,
        children: dirItems,
      };
    } catch (error: unknown) {
      this.loggerService.error("failed to readDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async makeDirectory(params: MakeDirectoryInput): Promise<MakeDirectoryOutput> {
    try {
      this.loggerService.trace("called makeDirectory", { params }, this.constructor.name);
      const dir = path.resolve(__dirname, this.envConfig.fileSystemPath, params.name);

      // check existence
      try {
        const dirItems = await fs.promises.readdir(dir);

        if (dirItems && dirItems.length > 0) {
          throw new DirectoryIsFilledError();
        } else {
          throw new DirectoryExistError();
        }
      } catch (error: unknown) {
        if ((error as Record<string, string>).code === "ENOENT") {
          await fs.promises.mkdir(dir);
        }
      }

      return {
        name: params.name,
        path: dir,
      };
    } catch (error: unknown) {
      this.loggerService.error("failed to makeDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  public async deleteDirectory(params: DeleteDirectoryInput): Promise<void> {
    try {
      this.loggerService.trace("called deleteDirectory", { params }, this.constructor.name);

      await fs.promises.rmdir(path.resolve(__dirname, this.envConfig.fileSystemPath, params.name));
    } catch (error: unknown) {
      this.loggerService.error("failed to deleteDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  private chunkFilePath(_path: string, n: number): string {
    try {
      this.loggerService.trace("called filePath", { path: _path }, this.constructor.name);

      return path.resolve(__dirname, _path, `${n}.tmp`);
    } catch (error: unknown) {
      this.loggerService.error("failed to filePath", { error, path: _path }, this.constructor.name);
      throw error;
    }
  }
}

export interface MessageEFSRepositoryInterface {
  deleteDirectory(params: DeleteDirectoryInput): Promise<void>,
  readDirectory(params: ReadDirectoryInput): Promise<ReadDirectoryOutput>,
  makeDirectory(params: MakeDirectoryInput): Promise<MakeDirectoryOutput>,
  addMessageChunk(params: AddMessageChunkInput): void
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
  name: string
}

interface GetMediaMessageFileOutput {
  name: string,
  path: string,
  fileData: fs.WriteStream,
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
