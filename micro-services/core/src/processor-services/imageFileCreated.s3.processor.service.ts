import "reflect-metadata";
import { injectable, inject } from "inversify";
import { GroupId, LoggerServiceInterface, MeetingId, OrganizationId, S3ProcessorServiceInterface, S3ProcessorServiceRecord, TeamId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { FileDirectory, FileExtension } from "../repositories/image.s3.repository";
import { UserServiceInterface } from "../services/tier-1/user.service";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { TeamServiceInterface } from "../services/tier-1/team.service";
import { GroupServiceInterface } from "../services/tier-1/group.service";
import { MeetingServiceInterface } from "../services/tier-1/meeting.service";

@injectable()
export class ImageFileCreatedS3ProcessorService implements S3ProcessorServiceInterface {
  private imageS3BucketName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
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

      const [ fileDirectory, idAndExtension ] = key.split("/") as [FileDirectory, string];
      const [ id, fileExtension ] = idAndExtension.split(".");

      const imageMimeType = fileExtensionToMimeTypeMap[fileExtension as FileExtension];

      if (fileDirectory === "users") {
        await this.userService.updateUser({ userId: id as UserId, updates: { imageMimeType } });
      } else if (fileDirectory === "organizations") {
        await this.organizationService.updateOrganization({ organizationId: id as OrganizationId, updates: { imageMimeType } });
      } else if (fileDirectory === "teams") {
        await this.teamService.updateTeam({ teamId: id as TeamId, updates: { imageMimeType } });
      } else if (fileDirectory === "groups") {
        await this.groupService.updateGroup({ groupId: id as GroupId, updates: { imageMimeType } });
      } else {
        await this.meetingService.updateMeeting({ meetingId: id as MeetingId, updates: { imageMimeType } });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type ImageFileCreatedS3ProcessorServiceConfig = Pick<EnvConfigInterface, "bucketNames">;
