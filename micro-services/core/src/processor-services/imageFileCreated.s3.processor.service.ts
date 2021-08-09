import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { UserServiceInterface } from "../entity-services/user.service";
import { TeamServiceInterface } from "../entity-services/team.service";
import { ConversationServiceInterface } from "../entity-services/conversation.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { FileExtension } from "../entity-services/image.file.service";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { ConversationId } from "../types/conversationId.type";

@injectable()
export class ImageFileCreatedS3ProcessorService implements S3ProcessorServiceInterface {
  private imageS3BucketName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: ImageFileCreatedS3ProcessorServiceConfig,
  ) {
    this.imageS3BucketName = config.bucketNames.image;
  }

  public determineRecordSupport(record: S3ProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.bucketName === this.imageS3BucketName;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: S3ProcessorServiceRecord): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { key } = record;

      const fileExtensionToMimeTypeMap: Record<FileExtension, ImageMimeType> = {
        jpeg: ImageMimeType.Jpeg,
        bmp: ImageMimeType.Bmp,
        png: ImageMimeType.Png,
      };

      const [ fileDirectory, idAndExtension ] = key.split("/");
      const [ id, fileExtension ] = idAndExtension.split(".");

      const imageMimeType = fileExtensionToMimeTypeMap[fileExtension as FileExtension];

      if (fileDirectory === "users") {
        await this.userService.updateUser({ userId: id as UserId, updates: { imageMimeType } });
      } else if (fileDirectory === "teams") {
        await this.teamService.updateTeam({ teamId: id as TeamId, updates: { imageMimeType } });
      } else {
        await this.conversationService.updateConversation({ conversationId: id as ConversationId, updates: { imageMimeType } });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type ImageFileCreatedS3ProcessorServiceConfig = Pick<EnvConfigInterface, "bucketNames">;
