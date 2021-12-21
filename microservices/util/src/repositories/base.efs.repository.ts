import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import { LoggerServiceInterface } from "../services/logger.service";
import { Fs, FsFactory } from "../factories/fs.factory";
import { Path, PathFactory } from "../factories/path.factory";

@injectable()
export abstract class BaseEfsRepository {
  private fileSystem: Fs;

  private pathService: Path;

  constructor(
    @unmanaged() protected loggerService: LoggerServiceInterface,
    @unmanaged() private basePath: string,
    @unmanaged() fsFactory: FsFactory,
    @unmanaged() pathFactory: PathFactory,
  ) {
    this.fileSystem = fsFactory();
    this.pathService = pathFactory();
  }

  protected async readFile(params: ReadFileInput): Promise<ReadFileOutput> {
    try {
      this.loggerService.trace("readFile called", { params }, this.constructor.name);

      const { path } = params;

      const { absolutePath } = this.generateAbsolutePath({ path });

      const file = await this.fileSystem.promises.readFile(absolutePath);

      return { file };
    } catch (error: unknown) {
      this.loggerService.error("Error in readFile", { error, params }, this.constructor.name);
      throw error;
    }
  }

  protected async writeFile(params: WriteFileInput): Promise<WriteFileOutput> {
    try {
      this.loggerService.trace("writeFile called", { params }, this.constructor.name);

      const { path, file } = params;

      const { absolutePath } = this.generateAbsolutePath({ path });

      await this.fileSystem.promises.writeFile(absolutePath, file);
    } catch (error: unknown) {
      this.loggerService.error("Error in writeFile", { error, params }, this.constructor.name);
      throw error;
    }
  }

  protected async readDirectory(params: ReadDirectoryInput): Promise<ReadDirectoryOutput> {
    try {
      this.loggerService.trace("readDirectory called", { params }, this.constructor.name);

      const { path } = params;

      const { absolutePath } = this.generateAbsolutePath({ path });

      const fileNames = await this.fileSystem.promises.readdir(absolutePath);

      return { fileNames };
    } catch (error: unknown) {
      this.loggerService.error("Error in readDirectory", { error, params }, this.constructor.name);
      throw error;
    }
  }

  protected async createDirectory(params: CreateDirectoryInput): Promise<CreateDirectoryOutput> {
    try {
      this.loggerService.trace("createDirectory called", { params }, this.constructor.name);

      const { path } = params;

      const { absolutePath } = this.generateAbsolutePath({ path });

      await this.fileSystem.promises.mkdir(absolutePath, { recursive: true });
    } catch (error: unknown) {
      this.loggerService.error("Error in createDirectory", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected async upsertDirectory(params: UpsertDirectoryInput): Promise<UpsertDirectoryOutput> {
    try {
      this.loggerService.trace("upsertDirectory called", { params }, this.constructor.name);

      const { path } = params;

      const { absolutePath } = this.generateAbsolutePath({ path });

      await this.fileSystem.promises.mkdir(absolutePath, { recursive: true });
    } catch (error: unknown) {
      if ((error as { code?: string; }).code === "EEXIST") {
        return;
      }

      this.loggerService.error("Error in upsertDirectory", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected async deleteDirectory(params: DeleteDirectoryInput): Promise<DeleteDirectoryOutput> {
    try {
      this.loggerService.trace("deleteDirectory called", { params }, this.constructor.name);

      const { path } = params;

      const { absolutePath } = this.generateAbsolutePath({ path });

      await this.fileSystem.rmfr(absolutePath);
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteDirectory", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private generateAbsolutePath(params: GenerateAbsolutePathInput): GenerateAbsolutePathOutput {
    try {
      this.loggerService.trace("generateAbsolutePath called", { params }, this.constructor.name);

      const { path } = params;

      const absolutePath = this.pathService.resolve(__dirname, this.basePath, path);

      return { absolutePath };
    } catch (error: unknown) {
      this.loggerService.error("Error in generateAbsolutePath", { error, params }, this.constructor.name);
      throw error;
    }
  }
}

interface ReadFileInput {
  path: string;
}

interface ReadFileOutput {
  file: Buffer;
}

interface ReadDirectoryInput {
  path: string;
}

interface ReadDirectoryOutput {
  fileNames: string[];
}

interface WriteFileInput {
  path: string;
  file: Buffer;
}

type WriteFileOutput = void;

interface CreateDirectoryInput {
  path: string;
}

type CreateDirectoryOutput = void;

interface UpsertDirectoryInput {
  path: string;
}

type UpsertDirectoryOutput = void;

interface DeleteDirectoryInput {
  path: string;
}

type DeleteDirectoryOutput = void;

interface GenerateAbsolutePathInput {
  path: string;
}

interface GenerateAbsolutePathOutput {
  absolutePath: string;
}
