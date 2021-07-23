import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface, MeetingConversation } from "../entity-services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { MeetingId } from "../types/meetingId.type";
import { ConversationType } from "../enums/conversationType.enum";

@injectable()
export class MeetingMediatorService implements MeetingMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput> {
    try {
      this.loggerService.trace("createMeeting called", { params }, this.constructor.name);

      const { name, createdBy, dueDate, teamId } = params;

      const { conversation } = await this.conversationService.createMeetingConversation({
        name,
        createdBy,
        dueDate,
        teamId,
      });

      await this.conversationUserRelationshipService.createConversationUserRelationship({ userId: createdBy, conversationId: conversation.id, role: Role.Admin, dueDate });

      const { type, ...restOfMeeting } = conversation;

      const meeting: Meeting = restOfMeeting;

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

      const { conversation } = await this.conversationService.getConversation({ conversationId: meetingId });

      const { type, ...restOfMeeting } = conversation as MeetingConversation;

      const meeting: Meeting = restOfMeeting;

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteMeeting(params: DeleteMeetingInput): Promise<DeleteMeetingOutput> {
    try {
      this.loggerService.trace("deleteMeeting called", { params }, this.constructor.name);

      const { meetingId } = params;

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId: meetingId });

      const userIds = conversationUserRelationships.map((relationship) => relationship.userId);

      await Promise.all(userIds.map((userId) => this.conversationUserRelationshipService.deleteConversationUserRelationship({ userId, conversationId: meetingId })));

      await this.conversationService.deleteConversation({ conversationId: meetingId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput> {
    try {
      this.loggerService.trace("addUserToMeeting called", { params }, this.constructor.name);

      const { meetingId, userId, role } = params;

      const { meeting } = await this.getMeeting({ meetingId });

      await this.conversationUserRelationshipService.createConversationUserRelationship({
        conversationId: meetingId,
        dueDate: meeting.dueDate,
        userId,
        role,
      });

      const membership: Membership = {
        meetingId,
        userId,
        role,
      };

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput> {
    try {
      this.loggerService.trace("removeUserFromMeeting called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.conversationUserRelationshipService.deleteConversationUserRelationship({
        conversationId: meetingId,
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

      const { userId, exclusiveStartKey, limit, sortBy = "updatedAt" } = params;

      const sortByToTypeMap: Record<"dueDate" | "updatedAt", "due_date" | ConversationType.Meeting> = {
        dueDate: "due_date",
        updatedAt: ConversationType.Meeting,
      };

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({
        userId,
        type: sortByToTypeMap[sortBy],
        exclusiveStartKey,
        limit,
      });

      const conversationIds = conversationUserRelationships.map((relationship) => relationship.conversationId);

      const { conversations } = await this.conversationService.getConversations({ conversationIds });

      const meetingsWithRoles: WithRole<Meeting>[] = (conversations as MeetingConversation[]).map((meeting, i) => {
        const { type, ...rest } = meeting;

        return { ...rest, role: conversationUserRelationships[i].role };
      });

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

      const { conversations, lastEvaluatedKey } = await this.conversationService.getConversationsByTeamId({
        teamId,
        type: ConversationType.Meeting,
        exclusiveStartKey,
        limit,
      });

      const meetings = conversations.map(({ type, ...meeting }) => meeting) as MeetingConversation[];

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput> {
    try {
      this.loggerService.trace("isMeetingMember called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.conversationUserRelationshipService.getConversationUserRelationship({
        conversationId: meetingId,
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

      const { conversationUserRelationship } = await this.conversationUserRelationshipService.getConversationUserRelationship({
        conversationId: meetingId,
        userId,
      });

      return { isMeetingAdmin: conversationUserRelationship.role === Role.Admin };
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
  getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput>
  deleteMeeting(params: DeleteMeetingInput): Promise<DeleteMeetingOutput>;
  addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput>;
  removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput>;
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
  getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput>;
  isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput>;
  isMeetingAdmin(params: IsMeetingAdminInput): Promise<IsMeetingAdminOutput>;
}

export type Meeting = Omit<MeetingConversation, "type">;
export interface Membership { meetingId: MeetingId; userId: UserId; role: Role; }

export interface CreateMeetingInput {
  name: string;
  createdBy: UserId;
  dueDate: string;
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

export interface DeleteMeetingInput {
  meetingId: MeetingId;
}

export type DeleteMeetingOutput = void;

export interface AddUserToMeetingInput {
  meetingId: MeetingId;
  userId: UserId;
  role: Role;
}

export interface AddUserToMeetingOutput {
  membership: Membership;
}

export interface RemoveUserFromMeetingInput {
  meetingId: MeetingId;
  userId: UserId;
}

export type RemoveUserFromMeetingOutput = void;

export interface GetMeetingsByUserIdInput {
  userId: UserId;
  sortBy?: "dueDate" | "updatedAt";
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
