import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamUserRelationshipRepositoryInterface, TeamUserRelationship as TeamUserRelationshipEntity } from "../repositories/teamUserRelationship.dynamo.repository";
import { TeamId } from "../types/teamId.type";
import { UserId } from "../types/userId.type";

@injectable()
export class TeamUserRelationshipService implements TeamUserRelationshipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamUserRelationshipRepositoryInterface) private teamUserRelationshipRepository: TeamUserRelationshipRepositoryInterface,
  ) {}

  public async createTeamUserRelationship(params: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("createTeamUserRelationship called", { params }, this.constructor.name);

      const { teamId, userId, role } = params;

      const teamUserRelationship: TeamUserRelationshipEntity = {
        teamId,
        userId,
        role,
      };

      await this.teamUserRelationshipRepository.createTeamUserRelationship({ teamUserRelationship });

      return { teamUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeamUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationship(params: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      const { teamUserRelationship } = await this.teamUserRelationshipRepository.getTeamUserRelationship({ teamId, userId });

      return { teamUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamUserRelationship(params: DeleteTeamUserRelationshipInput): Promise<DeleteTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      await this.teamUserRelationshipRepository.deleteTeamUserRelationship({ teamId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationshipsByTeamId(params: GetTeamUserRelationshipsByTeamIdInput): Promise<GetTeamUserRelationshipsByTeamIdOutput> {
    try {
      this.loggerService.trace("getTeamUserRelationshipsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { teamUserRelationships, lastEvaluatedKey } = await this.teamUserRelationshipRepository.getTeamUserRelationshipsByTeamId({ teamId, exclusiveStartKey, limit });

      return { teamUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationshipsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationshipsByUserId(params: GetTeamUserRelationshipsByUserIdInput): Promise<GetTeamUserRelationshipsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { teamUserRelationships, lastEvaluatedKey } = await this.teamUserRelationshipRepository.getTeamUserRelationshipsByUserId({ userId, exclusiveStartKey, limit });

      return { teamUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationshipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamUserRelationshipServiceInterface {
  createTeamUserRelationship(params: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput>;
  getTeamUserRelationship(params: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput>;
  deleteTeamUserRelationship(params: DeleteTeamUserRelationshipInput): Promise<DeleteTeamUserRelationshipOutput>;
  getTeamUserRelationshipsByTeamId(params: GetTeamUserRelationshipsByTeamIdInput): Promise<GetTeamUserRelationshipsByTeamIdOutput>;
  getTeamUserRelationshipsByUserId(params: GetTeamUserRelationshipsByUserIdInput): Promise<GetTeamUserRelationshipsByUserIdOutput>;
}

export type TeamUserRelationship = TeamUserRelationshipEntity;
export interface CreateTeamUserRelationshipInput {
  teamId: TeamId;
  userId: UserId;
  role: Role;
}

export interface CreateTeamUserRelationshipOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface GetTeamUserRelationshipInput {
  teamId: TeamId;
  userId: UserId;
}

export interface GetTeamUserRelationshipOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface DeleteTeamUserRelationshipInput {
  teamId: TeamId;
  userId: UserId;
}

export type DeleteTeamUserRelationshipOutput = void;

export interface GetTeamUserRelationshipsByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamUserRelationshipsByTeamIdOutput {
  teamUserRelationships: TeamUserRelationship[];
  lastEvaluatedKey?: string;
}

export interface GetTeamUserRelationshipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamUserRelationshipsByUserIdOutput {
  teamUserRelationships: TeamUserRelationship[];
  lastEvaluatedKey?: string;
}
