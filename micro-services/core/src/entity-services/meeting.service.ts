import { inject, injectable } from "inversify";
import { FileOperation, MeetingId, IdServiceInterface, LoggerServiceInterface, OrganizationId, TeamId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { MeetingRepositoryInterface, Meeting as MeetingEntity, RawMeeting as RawMeetingEntity, MeetingUpdates as RepositoryMeetingUpdates } from "../repositories/meeting.dynamo.repository";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";
import { EntityType } from "../enums/entityType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";

@injectable()
export class MeetingService implements MeetingServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.MeetingRepositoryInterface) private meetingRepository: MeetingRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private meetingSearchRepository: MeetingSearchRepositoryInterface,
  ) {}

  public async createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput> {
    try {
      this.loggerService.trace("createMeeting called", { params }, this.constructor.name);

      const { name, dueAt, organizationId, createdBy, teamId } = params;

      const meetingId: MeetingId = `${KeyPrefix.Meeting}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const now = new Date().toISOString();

      const meetingEntity: MeetingEntity = {
        imageMimeType,
        id: meetingId,
        organizationId,
        name,
        createdBy,
        dueAt,
        createdAt: now,
        updatedAt: now,
        activeAt: now,
        teamId,
      };

      await Promise.all([
        this.meetingRepository.createMeeting({ meeting: meetingEntity }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.Meeting, entityId: meetingId, file: image, mimeType: imageMimeType }),
      ]);

      const { entity: meeting } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Meeting, entity: meetingEntity });

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput> {
    try {
      this.loggerService.trace("getMeeting called", { params }, this.constructor.name);

      const { meetingId } = params;

      const { meeting: meetingEntity } = await this.meetingRepository.getMeeting({ meetingId });

      const { entity: meeting } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Meeting, entity: meetingEntity });

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMeeting(params: UpdateMeetingInput): Promise<UpdateMeetingOutput> {
    try {
      this.loggerService.trace("updateMeeting called", { params }, this.constructor.name);

      const { meetingId, updates } = params;

      const { meeting: meetingEntity } = await this.meetingRepository.updateMeeting({ meetingId, updates });

      const { entity: meeting } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Meeting, entity: meetingEntity });

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetings(params: GetMeetingsInput): Promise<GetMeetingsOutput> {
    try {
      this.loggerService.trace("getMeetings called", { params }, this.constructor.name);

      const { meetingIds } = params;

      const { meetings } = await this.meetingRepository.getMeetings({ meetingIds });

      const meetingMap: Record<string, Meeting> = {};
      meetings.forEach((meetingEntity) => {
        const { entity: meeting } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Meeting, entity: meetingEntity });

        meetingMap[meeting.id] = meeting;
      });

      const sortedMeetings = meetingIds.map((meetingId) => meetingMap[meetingId]);

      return { meetings: sortedMeetings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingRepository.getMeetingsByTeamId({ teamId, exclusiveStartKey, limit });

      const meetings = meetingEntities.map((meetingEntity) => {
        const { entity: meeting } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Meeting, entity: meetingEntity });

        return meeting;
      });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingRepository.getMeetingsByOrganizationId({ organizationId, exclusiveStartKey, limit });

      const meetings = meetingEntities.map((meetingEntity) => {
        const { entity: meeting } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Meeting, entity: meetingEntity });

        return meeting;
      });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getMeetingImageUploadUrl(params: GetMeetingImageUploadUrlInput): GetMeetingImageUploadUrlOutput {
    try {
      this.loggerService.trace("getMeetingImageUploadUrl called", { params }, this.constructor.name);

      const { meetingId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileRepository.getSignedUrl({
        operation: FileOperation.Upload,
        entityType: EntityType.Meeting,
        entityId: meetingId,
        mimeType,
      });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexMeetingForSearch(params: IndexMeetingForSearchInput): Promise<IndexMeetingForSearchOutput> {
    try {
      this.loggerService.trace("indexMeetingForSearch called", { params }, this.constructor.name);

      const { meeting: rawMeeting } = params;

      const { meeting } = this.meetingRepository.convertRawMeetingToMeeting({ rawMeeting });

      await this.meetingSearchRepository.indexDocument({ index: SearchIndex.Meeting, document: meeting });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexMeetingForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexMeetingForSearch(params: DeindexMeetingForSearchInput): Promise<DeindexMeetingForSearchOutput> {
    try {
      this.loggerService.trace("deindexMeetingForSearch called", { params }, this.constructor.name);

      const { meetingId } = params;

      await this.meetingSearchRepository.deindexDocument({ index: SearchIndex.Meeting, id: meetingId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexMeetingForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsBySearchTerm(params: GetMeetingsBySearchTermInput): Promise<GetMeetingsBySearchTermOutput> {
    try {
      this.loggerService.trace("getMeetingsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, meetingIds, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingSearchRepository.getMeetingsBySearchTerm({ searchTerm, meetingIds, limit, exclusiveStartKey });

      const searchMeetingIds = meetingEntities.map((meeting) => meeting.id);

      const { meetings } = await this.getMeetings({ meetingIds: searchMeetingIds });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingServiceInterface {
  createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput>;
  getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput>;
  updateMeeting(params: UpdateMeetingInput): Promise<UpdateMeetingOutput>;
  getMeetings(params: GetMeetingsInput): Promise<GetMeetingsOutput>;
  getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput>;
  getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput>;
  getMeetingImageUploadUrl(params: GetMeetingImageUploadUrlInput): GetMeetingImageUploadUrlOutput;
  indexMeetingForSearch(params: IndexMeetingForSearchInput): Promise<IndexMeetingForSearchOutput>;
  deindexMeetingForSearch(params: DeindexMeetingForSearchInput): Promise<DeindexMeetingForSearchOutput>;
  getMeetingsBySearchTerm(params: GetMeetingsBySearchTermInput): Promise<GetMeetingsBySearchTermOutput>;

}

export type Meeting = Omit<MeetingEntity, "imageMimeType"> & {
  image: string;
};

export interface CreateMeetingInput {
  name: string;
  organizationId: OrganizationId;
  createdBy: UserId;
  dueAt: string;
  teamId?: TeamId;
}

export interface CreateMeetingOutput {
  meeting: Meeting;
}

export interface GetMeetingInput {
  meetingId: MeetingId;
}

export interface GetMeetingOutput {
  meeting: Meeting;
}

export type MeetingUpdates = RepositoryMeetingUpdates;

export interface UpdateMeetingInput {
  meetingId: MeetingId;
  updates: MeetingUpdates;
}

export interface UpdateMeetingOutput {
  meeting: Meeting
}

export interface GetMeetingsInput {
  meetingIds: MeetingId[];
}

export interface GetMeetingsOutput {
  meetings: Meeting[];
}

export interface GetMeetingsByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByTeamIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByOrganizationIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface DeleteMeetingInput {
  meetingId: MeetingId;
}

export type DeleteMeetingOutput = void;

export interface IndexMeetingForSearchInput {
  meeting: RawMeetingEntity;
}

export type IndexMeetingForSearchOutput = void;

export interface DeindexMeetingForSearchInput {
  meetingId: MeetingId;
}

export type DeindexMeetingForSearchOutput = void;

export interface GetMeetingsBySearchTermInput {
  searchTerm: string;
  meetingIds?: MeetingId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsBySearchTermOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingImageUploadUrlInput {
  meetingId: MeetingId;
  mimeType: ImageMimeType;
}

export interface GetMeetingImageUploadUrlOutput {
  uploadUrl: string;
}

type MeetingSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getMeetingsBySearchTerm" | "getMeetingsBySearchTerm">;
