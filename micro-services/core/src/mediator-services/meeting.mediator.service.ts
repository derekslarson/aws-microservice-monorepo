import { inject, injectable } from "inversify";
import { LoggerServiceInterface, MeetingId, NotFoundError, OrganizationId, Role, TeamId, UserId, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MeetingServiceInterface, Meeting as MeetingEntity, MeetingUpdates } from "../entity-services/meeting.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { Membership as MembershipEntity, MembershipServiceInterface } from "../entity-services/membership.service";
import { MembershipType } from "../enums/membershipType.enum";
import { MembershipFetchType } from "../enums/membershipFetchType.enum";

@injectable()
export class MeetingMediatorService implements MeetingMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput> {
    try {
      this.loggerService.trace("createMeeting called", { params }, this.constructor.name);

      const { name, createdBy, dueAt, organizationId, teamId } = params;

      const { meeting } = await this.meetingService.createMeeting({
        name,
        createdBy,
        dueAt,
        organizationId,
        teamId,
      });

      await this.membershipService.createMembership({ userId: createdBy, entityId: meeting.id, type: MembershipType.Meeting, role: Role.Admin, dueAt });

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

      await this.meetingService.updateMeeting({ meetingId, updates });

      if (updates.dueAt) {
        const { memberships } = await this.membershipService.getMembershipsByEntityId({ entityId: meetingId });

        await Promise.all(memberships.map(({ userId }) => this.membershipService.updateMembership({ userId, entityId: meetingId, updates: { dueAt: updates.dueAt } })));
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput> {
    try {
      this.loggerService.trace("getMeeting called", { params }, this.constructor.name);

      const { meetingId } = params;

      const { meeting } = await this.meetingService.getMeeting({ meetingId });

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getMeetingImageUploadUrl(params: GetMeetingImageUploadUrlInput): GetMeetingImageUploadUrlOutput {
    try {
      this.loggerService.trace("getMeetingImageUploadUrl called", { params }, this.constructor.name);

      const { meetingId, mimeType } = params;

      const { uploadUrl } = this.meetingService.getMeetingImageUploadUrl({ meetingId, mimeType });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput> {
    try {
      this.loggerService.trace("addUserToMeeting called", { params }, this.constructor.name);

      const { meetingId, userId, role } = params;

      const { meeting } = await this.getMeeting({ meetingId });

      const { membership } = await this.membershipService.createMembership({ entityId: meetingId, type: MembershipType.Meeting, dueAt: meeting.dueAt, userId, role });

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

      await this.membershipService.deleteMembership({ entityId: meetingId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit, sortByDueAt } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipService.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.Meeting,
        sortByDueAt,
        exclusiveStartKey,
        limit,
      });

      const meetingIds = memberships.map((membership) => membership.entityId);

      const { meetings: meetingEntities } = await this.meetingService.getMeetings({ meetingIds });

      const meetings = meetingEntities.map((meeting, i) => ({
        ...meeting,
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

      const { teamId, exclusiveStartKey, limit } = params;

      const { meetings, lastEvaluatedKey } = await this.meetingService.getMeetingsByTeamId({
        teamId,
        exclusiveStartKey,
        limit,
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

      const { meetings, lastEvaluatedKey } = await this.meetingService.getMeetingsByOrganizationId({
        organizationId,
        exclusiveStartKey,
        limit,
      });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput> {
    try {
      this.loggerService.trace("isMeetingMember called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.membershipService.getMembership({ entityId: meetingId, userId });

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

      const { membership } = await this.membershipService.getMembership({ entityId: meetingId, userId });

      return { isMeetingAdmin: membership.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isMeetingAdmin: false };
      }
      this.loggerService.error("Error in isMeetingAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMediatorServiceInterface {
  createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput>;
  updateMeeting(params: UpdateMeetingInput): Promise<UpdateMeetingOutput>;
  getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput>
  addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput>;
  removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput>;
  getMeetingImageUploadUrl(params: GetMeetingImageUploadUrlInput): GetMeetingImageUploadUrlOutput;
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
  getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput>;
  getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput>;
  isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput>;
  isMeetingAdmin(params: IsMeetingAdminInput): Promise<IsMeetingAdminOutput>;
}

export type Meeting = MeetingEntity;

export type MeetingByUserId = Meeting & {
  activeAt: string;
  lastViewedAt: string;
  unseenMessages: number;
};

export interface CreateMeetingInput {
  name: string;
  createdBy: UserId;
  dueAt: string;
  organizationId: OrganizationId;
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

export interface GetMeetingImageUploadUrlInput {
  meetingId: MeetingId;
  mimeType: ImageMimeType;
}

export interface GetMeetingImageUploadUrlOutput {
  uploadUrl: string;
}

export type MeetingMembership = MembershipEntity;

export interface AddUserToMeetingInput {
  meetingId: MeetingId;
  userId: UserId;
  role: Role;
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
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByUserIdOutput {
  meetings: WithRole<MeetingByUserId>[];
  lastEvaluatedKey?: string;
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
