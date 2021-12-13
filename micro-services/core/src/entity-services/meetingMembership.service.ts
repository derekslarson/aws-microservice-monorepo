import { inject, injectable } from "inversify";
import { MeetingId, LoggerServiceInterface, Role, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MeetingMembershipRepositoryInterface, MeetingMembership as MeetingMembershipEntity, MeetingMembershipUpdates } from "../repositories/meetingMembership.dynamo.repository";

@injectable()
export class MeetingMembershipService implements MeetingMembershipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingMembershipRepositoryInterface) private meetingMembershipRepository: MeetingMembershipRepositoryInterface,
  ) {}

  public async createMeetingMembership(params: CreateMeetingMembershipInput): Promise<CreateMeetingMembershipOutput> {
    try {
      this.loggerService.trace("createMeetingMembership called", { params }, this.constructor.name);

      const { meetingId, userId, role, meetingDueAt } = params;

      const now = new Date().toISOString();

      const meetingMembership: MeetingMembershipEntity = {
        meetingId,
        userId,
        role,
        meetingDueAt,
        createdAt: now,
        meetingActiveAt: now,
      };

      await this.meetingMembershipRepository.createMeetingMembership({ meetingMembership });

      return { meetingMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingMembership(params: GetMeetingMembershipInput): Promise<GetMeetingMembershipOutput> {
    try {
      this.loggerService.trace("getMeetingMembership called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      const { meetingMembership } = await this.meetingMembershipRepository.getMeetingMembership({ meetingId, userId });

      return { meetingMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMeetingMembership(params: UpdateMeetingMembershipInput): Promise<UpdateMeetingMembershipOutput> {
    try {
      this.loggerService.trace("updateMeetingMembership called", { params }, this.constructor.name);

      const { meetingId, userId, updates } = params;

      const { meetingMembership } = await this.meetingMembershipRepository.updateMeetingMembership({ meetingId, userId, updates });

      return { meetingMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeetingMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteMeetingMembership(params: DeleteMeetingMembershipInput): Promise<DeleteMeetingMembershipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.meetingMembershipRepository.deleteMeetingMembership({ meetingId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingMembershipsByMeetingId(params: GetMeetingMembershipsByMeetingIdInput): Promise<GetMeetingMembershipsByMeetingIdOutput> {
    try {
      this.loggerService.trace("getMeetingMembershipsByMeetingId called", { params }, this.constructor.name);

      const { meetingId, exclusiveStartKey, limit } = params;

      const { meetingMemberships, lastEvaluatedKey } = await this.meetingMembershipRepository.getMeetingMembershipsByMeetingId({ meetingId, exclusiveStartKey, limit });

      return { meetingMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingMembershipsByMeetingId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingMembershipsByUserId(params: GetMeetingMembershipsByUserIdInput): Promise<GetMeetingMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getMeetingMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, byMeetingDueAt, exclusiveStartKey, limit } = params;

      const { meetingMemberships, lastEvaluatedKey } = await this.meetingMembershipRepository.getMeetingMembershipsByUserId({ userId, byMeetingDueAt, exclusiveStartKey, limit });

      return { meetingMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMembershipServiceInterface {
  createMeetingMembership(params: CreateMeetingMembershipInput): Promise<CreateMeetingMembershipOutput>;
  getMeetingMembership(params: GetMeetingMembershipInput): Promise<GetMeetingMembershipOutput>;
  updateMeetingMembership(params: UpdateMeetingMembershipInput): Promise<UpdateMeetingMembershipOutput>;
  deleteMeetingMembership(params: DeleteMeetingMembershipInput): Promise<DeleteMeetingMembershipOutput>;
  getMeetingMembershipsByMeetingId(params: GetMeetingMembershipsByMeetingIdInput): Promise<GetMeetingMembershipsByMeetingIdOutput>;
  getMeetingMembershipsByUserId(params: GetMeetingMembershipsByUserIdInput): Promise<GetMeetingMembershipsByUserIdOutput>;
}

export type MeetingMembership = MeetingMembershipEntity;

export interface CreateMeetingMembershipInput {
  meetingId: MeetingId;
  userId: UserId;
  role: Role;
  meetingDueAt: string;
}

export interface CreateMeetingMembershipOutput {
  meetingMembership: MeetingMembership;
}

export interface GetMeetingMembershipInput {
  meetingId: MeetingId;
  userId: UserId;
}

export interface GetMeetingMembershipOutput {
  meetingMembership: MeetingMembership;
}

export interface UpdateMeetingMembershipInput {
  meetingId: MeetingId;
  userId: UserId;
  updates: MeetingMembershipUpdates;
}

export interface UpdateMeetingMembershipOutput {
  meetingMembership: MeetingMembership;
}

export interface DeleteMeetingMembershipInput {
  meetingId: MeetingId;
  userId: UserId;
}

export type DeleteMeetingMembershipOutput = void;

export interface GetMeetingMembershipsByMeetingIdInput {
  meetingId: MeetingId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingMembershipsByMeetingIdOutput {
  meetingMemberships: MeetingMembership[];
  lastEvaluatedKey?: string;
}
export interface GetMeetingMembershipsByUserIdInput {
  userId: UserId;
  byMeetingDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}
export interface GetMeetingMembershipsByUserIdOutput {
  meetingMemberships: MeetingMembership[];
  lastEvaluatedKey?: string;
}
