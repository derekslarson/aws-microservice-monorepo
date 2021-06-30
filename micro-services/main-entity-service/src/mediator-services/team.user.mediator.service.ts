import { inject, injectable } from "inversify";
import { LoggerServiceInterface, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamUserRelationship } from "../models/team.user.relationship.model";
import { User } from "../models/user.model";
import { UserServiceInterface } from "../services/user.service";
import { TeamServiceInterface } from "../services/team.service";
import { TeamUserRelationshipServiceInterface } from "../services/teamUserRelationship.service";
import { Team } from "../models/team.model";

@injectable()
export class TeamUserMediatorService implements TeamUserMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamUserRelationshipServiceInterface) private teamUserRelationshipService: TeamUserRelationshipServiceInterface,
  ) {}

  public async getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey } = params;

      const { teamUserRelationships, lastEvaluatedKey } = await this.teamUserRelationshipService.getTeamUserRelationshipsByTeamId({ teamId, exclusiveStartKey });

      const userIds = teamUserRelationships.map((relationship) => relationship.userId);

      const { users } = await this.userService.getUsers({ userIds });

      const usersWithRoles = users.map((user, i) => ({ ...user, role: teamUserRelationships[i].role }));

      return { users: usersWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey } = params;

      const { teamUserRelationships, lastEvaluatedKey } = await this.teamUserRelationshipService.getTeamUserRelationshipsByUserId({ userId, exclusiveStartKey });

      const teamIds = teamUserRelationships.map((relationship) => relationship.teamId);

      const { teams } = await this.teamService.getTeams({ teamIds });

      const teamsWithRoles = teams.map((user, i) => ({ ...user, role: teamUserRelationships[i].role }));

      return { teams: teamsWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamUserMediatorServiceInterface {
  getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput>;
  getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput>;
}

export interface GetUsersByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetUsersByTeamIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

export interface GetTeamsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetTeamsByUserIdOutput {
  teams: WithRole<Team>[];
  lastEvaluatedKey?: string;
}
