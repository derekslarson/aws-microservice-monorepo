import { inject, injectable } from "inversify";
import { LoggerServiceInterface, MeetingId, NotFoundError, OrganizationId, Role, TeamId, UserId, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MeetingServiceInterface, Meeting, MeetingUpdates } from "../entity-services/meeting.service";
import { MeetingMembership as MeetingMembershipEntity, MeetingMembershipServiceInterface } from "../entity-services/meetingMembership.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";

@injectable()
export class MeetingMediatorService implements MeetingMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.MeetingMembershipServiceInterface) private meetingMembershipService: MeetingMembershipServiceInterface,
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

      await this.meetingMembershipService.createMeetingMembership({ userId: createdBy, meetingId: meeting.id, role: Role.Admin, meetingDueAt: dueAt });

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
        const { meetingMemberships } = await this.meetingMembershipService.getMeetingMembershipsByMeetingId({ meetingId });

        await Promise.all(meetingMemberships.map(({ userId }) => this.meetingMembershipService.updateMeetingMembership({ userId, meetingId, updates: { meetingDueAt: updates.dueAt } })));
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

      await this.meetingMembershipService.createMeetingMembership({ meetingId, meetingDueAt: meeting.dueAt, userId, role });

      const meetingMembership: MeetingMembership = {
        meetingId,
        userId,
        role,
      };

      return { meetingMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput> {
    try {
      this.loggerService.trace("removeUserFromMeeting called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.meetingMembershipService.deleteMeetingMembership({
        meetingId,
        userId,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit, byMeetingDueAt } = params;

      const { meetingMemberships, lastEvaluatedKey } = await this.meetingMembershipService.getMeetingMembershipsByUserId({
        userId,
        byMeetingDueAt,
        exclusiveStartKey,
        limit,
      });

      const meetingIds = meetingMemberships.map((relationship) => relationship.meetingId);

      const { meetings } = await this.meetingService.getMeetings({ meetingIds });

      const meetingsWithRoles = meetings.map((meeting, i) => ({
        ...meeting,
        role: meetingMemberships[i].role,
      }));

      return { meetings: meetingsWithRoles, lastEvaluatedKey };
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

      await this.meetingMembershipService.getMeetingMembership({
        meetingId,
        userId,
      });

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

      const { meetingMembership } = await this.meetingMembershipService.getMeetingMembership({
        meetingId,
        userId,
      });

      return { isMeetingAdmin: meetingMembership.role === Role.Admin };
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

export type MeetingMembership = Pick<MeetingMembershipEntity, "userId" | "meetingId" | "role">;

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
  byMeetingDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByUserIdOutput {
  meetings: WithRole<Meeting>[];
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
