import { inject, injectable } from "inversify";
import { TeamId, LoggerServiceInterface, Role, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { TeamMembershipRepositoryInterface, TeamMembership as TeamMembershipEntity, TeamMembershipUpdates } from "../repositories/teamMembership.dynamo.repository";

@injectable()
export class TeamMembershipService implements TeamMembershipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamMembershipRepositoryInterface) private teamMembershipRepository: TeamMembershipRepositoryInterface,
  ) {}

  public async createTeamMembership(params: CreateTeamMembershipInput): Promise<CreateTeamMembershipOutput> {
    try {
      this.loggerService.trace("createTeamMembership called", { params }, this.constructor.name);

      const { teamId, userId, role } = params;

      const now = new Date().toISOString();

      const teamMembership: TeamMembershipEntity = {
        teamId,
        userId,
        role,
        createdAt: now,
      };

      await this.teamMembershipRepository.createTeamMembership({ teamMembership });

      return { teamMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeamMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamMembership(params: GetTeamMembershipInput): Promise<GetTeamMembershipOutput> {
    try {
      this.loggerService.trace("getTeamMembership called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      const { teamMembership } = await this.teamMembershipRepository.getTeamMembership({ teamId, userId });

      return { teamMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateTeamMembership(params: UpdateTeamMembershipInput): Promise<UpdateTeamMembershipOutput> {
    try {
      this.loggerService.trace("updateTeamMembership called", { params }, this.constructor.name);

      const { teamId, userId, updates } = params;

      const { teamMembership } = await this.teamMembershipRepository.updateTeamMembership({ teamId, userId, updates });

      return { teamMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateTeamMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamMembership(params: DeleteTeamMembershipInput): Promise<DeleteTeamMembershipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      await this.teamMembershipRepository.deleteTeamMembership({ teamId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamMembershipsByTeamId(params: GetTeamMembershipsByTeamIdInput): Promise<GetTeamMembershipsByTeamIdOutput> {
    try {
      this.loggerService.trace("getTeamMembershipsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { teamMemberships, lastEvaluatedKey } = await this.teamMembershipRepository.getTeamMembershipsByTeamId({ teamId, exclusiveStartKey, limit });

      return { teamMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamMembershipsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamMembershipsByUserId(params: GetTeamMembershipsByUserIdInput): Promise<GetTeamMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { teamMemberships, lastEvaluatedKey } = await this.teamMembershipRepository.getTeamMembershipsByUserId({ userId, exclusiveStartKey, limit });

      return { teamMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamMembershipServiceInterface {
  createTeamMembership(params: CreateTeamMembershipInput): Promise<CreateTeamMembershipOutput>;
  getTeamMembership(params: GetTeamMembershipInput): Promise<GetTeamMembershipOutput>;
  deleteTeamMembership(params: DeleteTeamMembershipInput): Promise<DeleteTeamMembershipOutput>;
  getTeamMembershipsByTeamId(params: GetTeamMembershipsByTeamIdInput): Promise<GetTeamMembershipsByTeamIdOutput>;
  getTeamMembershipsByUserId(params: GetTeamMembershipsByUserIdInput): Promise<GetTeamMembershipsByUserIdOutput>;
}

export type TeamMembership = TeamMembershipEntity;

export interface CreateTeamMembershipInput {
  teamId: TeamId;
  userId: UserId;
  role: Role;
}

export interface CreateTeamMembershipOutput {
  teamMembership: TeamMembership;
}

export interface GetTeamMembershipInput {
  teamId: TeamId;
  userId: UserId;
}

export interface GetTeamMembershipOutput {
  teamMembership: TeamMembership;
}

export interface UpdateTeamMembershipInput {
  teamId: TeamId;
  userId: UserId;
  updates: TeamMembershipUpdates;
}

export interface UpdateTeamMembershipOutput {
  teamMembership: TeamMembership;
}

export interface DeleteTeamMembershipInput {
  teamId: TeamId;
  userId: UserId;
}

export type DeleteTeamMembershipOutput = void;

export interface GetTeamMembershipsByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamMembershipsByTeamIdOutput {
  teamMemberships: TeamMembership[];
  lastEvaluatedKey?: string;
}
export interface GetTeamMembershipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}
export interface GetTeamMembershipsByUserIdOutput {
  teamMemberships: TeamMembership[];
  lastEvaluatedKey?: string;
}
