/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { Role } from "@yac/util/src/enums/role.enum";
import { UserId } from "@yac/util/src/types/userId.type";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TeamId } from "@yac/util/src/types/teamId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { FileOperation } from "@yac/util/src/enums/fileOperation.enum";
import { MeetingId } from "@yac/util/src/types/meetingId.type";
import { RawMeeting as RawMeetingEntity, Meeting as MeetingEntity, MeetingRepositoryInterface, MeetingUpdates } from "../../repositories/meeting.dynamo.repository";
import { MeetingMembership as MeetingMembershipEntity, MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { ImageFileRepositoryInterface } from "../../repositories/image.s3.repository";
import { TYPES } from "../../inversion-of-control/types";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MembershipType } from "../../enums/membershipType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";
import { MembershipFetchType } from "../../enums/membershipFetchType.enum";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { SearchIndex } from "../../enums/searchIndex.enum";

@injectable()
export class MeetingService implements MeetingServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.MeetingRepositoryInterface) private meetingRepository: MeetingRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private meetingSearchRepository: MeetingSearchRepositoryInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput> {
    try {
      this.loggerService.trace("createMeeting called", { params }, this.constructor.name);

      const { name, createdBy, organizationId, dueAt, teamId } = params;

      const meetingId: MeetingId = `${KeyPrefix.Meeting}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const now = new Date().toISOString();

      const meetingEntity: MeetingEntity = {
        imageMimeType,
        id: meetingId,
        organizationId,
        name,
        dueAt,
        createdBy,
        createdAt: now,
        updatedAt: now,
        activeAt: now,
        teamId,
      };

      await Promise.all([
        this.meetingRepository.createMeeting({ meeting: meetingEntity }),
        this.addUserToMeeting({ userId: createdBy, meetingId, role: Role.Admin, dueAt }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.Meeting, entityId: meetingId, file: image, mimeType: imageMimeType }),
      ]);

      const { entity: meeting } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Meeting, entity: meetingEntity });

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMeeting(params: UpdateMeetingInput): Promise<UpdateMeetingOutput> {
    try {
      this.loggerService.trace("updateMeeting called", { params }, this.constructor.name);

      const { meetingId, updates } = params;

      await this.meetingRepository.updateMeeting({ meetingId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput> {
    try {
      this.loggerService.trace("addUserToMeeting called", { params }, this.constructor.name);

      const { meetingId, userId, role, dueAt: dueAtParam } = params;

      let dueAt: string;

      if (dueAtParam) {
        dueAt = dueAtParam;
      } else {
        const { meeting } = await this.meetingRepository.getMeeting({ meetingId });
        dueAt = meeting.dueAt;
      }

      const now = new Date().toISOString();

      const membership: MeetingMembership = {
        createdAt: now,
        activeAt: now,
        userActiveAt: now,
        unseenMessages: 0,
        userId,
        entityId: meetingId,
        type: MembershipType.Meeting,
        role,
        dueAt,
      };

      await this.membershipRepository.createMembership({ membership });

      return { meetingMembership: membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput> {
    try {
      this.loggerService.trace("removeUserFromMeeting called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.membershipRepository.deleteMembership({ entityId: meetingId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromMeeting", { error, params }, this.constructor.name);

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

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, sortByDueAt, exclusiveStartKey, limit } = params;

      if (searchTerm) {
        const { memberships } = await this.membershipRepository.getMembershipsByUserId({ userId, type: MembershipFetchType.Meeting });

        const meetingIds = memberships.map((membership) => membership.entityId);

        const { meetings: meetingEntities, lastEvaluatedKey } = await this.getMeetingsBySearchTerm({ meetingIds, searchTerm, sortByDueAt, exclusiveStartKey, limit });

        const membershipMap: Record<string, MeetingMembership> = {};
        memberships.forEach((membership) => membershipMap[membership.entityId] = membership);

        const meetings = meetingEntities.map((meetingEntity) => ({
          ...meetingEntity,
          role: membershipMap[meetingEntity.id].role,
          activeAt: membershipMap[meetingEntity.id].activeAt,
          lastViewedAt: membershipMap[meetingEntity.id].userActiveAt,
          unseenMessages: membershipMap[meetingEntity.id].unseenMessages,
        }));

        return { meetings, lastEvaluatedKey };
      }

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({
        userId,
        sortByDueAt,
        type: MembershipFetchType.Meeting,
        exclusiveStartKey,
        limit,
      });

      const meetingIds = memberships.map((membership) => membership.entityId);

      const { meetings: meetingEntities } = await this.getMeetings({ meetingIds });

      const meetings = meetingEntities.map((meetingEntity, i) => ({
        ...meetingEntity,
        role: memberships[i].role,
        activeAt: memberships[i].activeAt,
        lastViewedAt: memberships[i].userActiveAt,
        unseenMessages: memberships[i].unseenMessages,
      }));

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByTeamId called", { params }, this.constructor.name);

      const { teamId, searchTerm, sortByDueAt, exclusiveStartKey, limit } = params;

      if (searchTerm) {
        const { meetings, lastEvaluatedKey } = await this.getMeetingsBySearchTerm({ teamId, searchTerm, sortByDueAt, exclusiveStartKey, limit });

        return { meetings, lastEvaluatedKey };
      }

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingRepository.getMeetingsByTeamId({
        teamId,
        sortByDueAt,
        exclusiveStartKey,
        limit,
      });

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

      const { organizationId, sortByDueAt, searchTerm, exclusiveStartKey, limit } = params;

      if (searchTerm) {
        const { meetings, lastEvaluatedKey } = await this.getMeetingsBySearchTerm({ organizationId, searchTerm, sortByDueAt, exclusiveStartKey, limit });

        return { meetings, lastEvaluatedKey };
      }

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingRepository.getMeetingsByOrganizationId({ organizationId, sortByDueAt, exclusiveStartKey, limit });

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

  public async isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput> {
    try {
      this.loggerService.trace("isMeetingMember called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.membershipRepository.getMembership({ entityId: meetingId, userId });

      return { isMeetingMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isMeetingMember: false };
      }
      this.loggerService.error("Error in isMeetingMember", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isMeetingAdmin(params: IsMeetingAdminInput): Promise<IsMeetingAdminOutput> {
    try {
      this.loggerService.trace("isMeetingAdmin called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      const { membership } = await this.membershipRepository.getMembership({ entityId: meetingId, userId });

      return { isMeetingAdmin: membership.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isMeetingAdmin: false };
      }
      this.loggerService.error("Error in isMeetingAdmin", { error, params }, this.constructor.name);

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

  private async getMeetingsBySearchTerm(params: GetMeetingsBySearchTermInput): Promise<GetMeetingsBySearchTermOutput> {
    try {
      this.loggerService.trace("getMeetingsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, meetingIds, organizationId, sortByDueAt, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingSearchRepository.getMeetingsBySearchTerm({ searchTerm, meetingIds, organizationId, sortByDueAt, limit, exclusiveStartKey });

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
  updateMeeting(params: UpdateMeetingInput): Promise<UpdateMeetingOutput>;
  getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput>;
  getMeetings(params: GetMeetingsInput): Promise<GetMeetingsOutput>;
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
  getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput>;
  getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput>;
  getMeetingImageUploadUrl(params: GetMeetingImageUploadUrlInput): GetMeetingImageUploadUrlOutput;
  addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput>;
  removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput>;
  isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput>;
  isMeetingAdmin(params: IsMeetingAdminInput): Promise<IsMeetingAdminOutput>;
  indexMeetingForSearch(params: IndexMeetingForSearchInput): Promise<IndexMeetingForSearchOutput>;
  deindexMeetingForSearch(params: DeindexMeetingForSearchInput): Promise<DeindexMeetingForSearchOutput>;
}

export type Meeting = Omit<MeetingEntity, "imageMimeType"> & {
  image: string;
};

export type MeetingByUserId = Meeting & {
  role: Role;
  activeAt: string;
  lastViewedAt: string;
  unseenMessages: number;
};

export interface CreateMeetingInput {
  name: string;
  createdBy: UserId;
  organizationId: OrganizationId;
  dueAt: string;
  teamId?: TeamId;
}

export interface CreateMeetingOutput {
  meeting: Meeting;
}

export interface UpdateMeetingInput {
  meetingId: MeetingId;
  updates: MeetingUpdates;
}

export type UpdateMeetingOutput = void;

export interface GetMeetingInput {
  meetingId: MeetingId;
}

export interface GetMeetingOutput {
  meeting: Meeting;
}

export interface GetMeetingsInput {
  meetingIds: MeetingId[];
}

export interface GetMeetingsOutput {
  meetings: Meeting[];
}

export interface GetMeetingImageUploadUrlInput {
  meetingId: MeetingId;
  mimeType: ImageMimeType;
}

export interface GetMeetingImageUploadUrlOutput {
  uploadUrl: string;
}

export type MeetingMembership = MeetingMembershipEntity;

export interface AddUserToMeetingInput {
  meetingId: MeetingId;
  userId: UserId;
  role: Role;
  dueAt?: string;
}

export interface AddUserToMeetingOutput {
  meetingMembership: MeetingMembership;
}

export interface RemoveUserFromMeetingInput {
  meetingId: MeetingId;
  userId: UserId;
}

export type RemoveUserFromMeetingOutput = void;

export interface GetMeetingsByUserIdInput {
  userId: UserId;
  searchTerm?: string;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByUserIdOutput {
  meetings: MeetingByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByTeamIdInput {
  teamId: TeamId;
  searchTerm?: string;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByTeamIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByOrganizationIdInput {
  organizationId: OrganizationId;
  searchTerm?: string;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByOrganizationIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface IsMeetingMemberInput {
  meetingId: MeetingId;
  userId: UserId;
}

export interface IsMeetingMemberOutput {
  isMeetingMember: boolean;
}

export interface IsMeetingAdminInput {
  meetingId: MeetingId;
  userId: UserId;
}

export interface IsMeetingAdminOutput {
  isMeetingAdmin: boolean;
}

export interface IndexMeetingForSearchInput {
  meeting: RawMeetingEntity;
}

export type IndexMeetingForSearchOutput = void;

export interface DeindexMeetingForSearchInput {
  meetingId: MeetingId;
}

export type DeindexMeetingForSearchOutput = void;

interface GetMeetingsBySearchTermInput {
  searchTerm: string;
  teamId?: TeamId;
  organizationId?: OrganizationId;
  meetingIds?: MeetingId[];
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetMeetingsBySearchTermOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

type MeetingSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getMeetingsBySearchTerm">;
