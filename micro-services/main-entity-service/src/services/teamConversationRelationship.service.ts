import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamConversationRelationship } from "../models/team.conversation.relationship.model";
import { TeamConversationRelationshipRepositoryInterface } from "../repositories/teamConversationRelationship.dynamo.repository";

@injectable()
export class TeamConversationRelationshipService implements TeamConversationRelationshipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamConversationRelationshipRepositoryInterface) private teamConversationRelationshipRepository: TeamConversationRelationshipRepositoryInterface,
  ) {}

  public async createTeamConversationRelationship(params: CreateTeamConversationRelationshipInput): Promise<CreateTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("createTeamConversationRelationship called", { params }, this.constructor.name);

      const { teamId, conversationId } = params;

      const teamConversationRelationship: TeamConversationRelationship = {
        teamId,
        conversationId,
      };

      await this.teamConversationRelationshipRepository.createTeamConversationRelationship({ teamConversationRelationship });

      return { teamConversationRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeamConversationRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamConversationRelationship(params: GetTeamConversationRelationshipInput): Promise<GetTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("removeConversationFromTeam called", { params }, this.constructor.name);

      const { teamId, conversationId } = params;

      const { teamConversationRelationship } = await this.teamConversationRelationshipRepository.getTeamConversationRelationship({ teamId, conversationId });

      return { teamConversationRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeConversationFromTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamConversationRelationship(params: DeleteTeamConversationRelationshipInput): Promise<DeleteTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("removeConversationFromTeam called", { params }, this.constructor.name);

      const { teamId, conversationId } = params;

      await this.teamConversationRelationshipRepository.deleteTeamConversationRelationship({ teamId, conversationId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeConversationFromTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamConversationRelationshipsByTeamId(params: GetTeamConversationRelationshipsByTeamIdInput): Promise<GetTeamConversationRelationshipsByTeamIdOutput> {
    try {
      this.loggerService.trace("getTeamConversationRelationshipsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey } = params;

      const { teamConversationRelationships, lastEvaluatedKey } = await this.teamConversationRelationshipRepository.getTeamConversationRelationshipsByTeamId({ teamId, exclusiveStartKey });

      return { teamConversationRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamConversationRelationshipsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamConversationRelationshipServiceInterface {
  createTeamConversationRelationship(params: CreateTeamConversationRelationshipInput): Promise<CreateTeamConversationRelationshipOutput>;
  getTeamConversationRelationship(params: GetTeamConversationRelationshipInput): Promise<GetTeamConversationRelationshipOutput>;
  deleteTeamConversationRelationship(params: DeleteTeamConversationRelationshipInput): Promise<DeleteTeamConversationRelationshipOutput>;
  getTeamConversationRelationshipsByTeamId(params: GetTeamConversationRelationshipsByTeamIdInput): Promise<GetTeamConversationRelationshipsByTeamIdOutput>;
}

export interface CreateTeamConversationRelationshipInput {
  teamId: string;
  conversationId: string;
}

export interface CreateTeamConversationRelationshipOutput {
  teamConversationRelationship: TeamConversationRelationship;
}

export interface GetTeamConversationRelationshipInput {
  teamId: string;
  conversationId: string;
}

export interface GetTeamConversationRelationshipOutput {
  teamConversationRelationship: TeamConversationRelationship;
}

export interface DeleteTeamConversationRelationshipInput {
  teamId: string;
  conversationId: string;
}

export type DeleteTeamConversationRelationshipOutput = void;

export interface GetTeamConversationRelationshipsByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetTeamConversationRelationshipsByTeamIdOutput {
  teamConversationRelationships: TeamConversationRelationship[];
  lastEvaluatedKey?: string;
}
