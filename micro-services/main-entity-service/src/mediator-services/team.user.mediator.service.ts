import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { User } from "../models/user.model";
import { UserServiceInterface } from "../services/user.service";
import { TeamServiceInterface } from "../services/team.service";
import { TeamUserRelationshipServiceInterface } from "../services/teamUserRelationship.service";
import { Team } from "../models/team.model";
import { TeamUserRelationship } from "../models/team.user.relationship.model";

@injectable()
export class TeamUserMediatorService implements TeamUserMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamUserRelationshipServiceInterface) private teamUserRelationshipService: TeamUserRelationshipServiceInterface,
  ) {}

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { name, createdBy } = params;

      const { team } = await this.teamService.createTeam({ name, createdBy });

      await this.teamUserRelationshipService.createTeamUserRelationship({ teamId: team.id, userId: createdBy, role: Role.Admin });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput> {
    try {
      this.loggerService.trace("addUserToTeam called", { params }, this.constructor.name);

      const { teamId, userId, role } = params;

      const { teamUserRelationship } = await this.teamUserRelationshipService.createTeamUserRelationship({ teamId, userId, role });

      return { teamUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromTeam(params: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      await this.teamUserRelationshipService.deleteTeamUserRelationship({ teamId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

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

  public async isTeamMember(params: IsTeamMemberInput): Promise<IsTeamMemberOutput> {
    try {
      this.loggerService.trace("isTeamMember called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      await this.teamUserRelationshipService.getTeamUserRelationship({ teamId, userId });

      return { isTeamMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isTeamMember: false };
      }
      this.loggerService.error("Error in isTeamMember", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isTeamAdmin(params: IsTeamAdminInput): Promise<IsTeamAdminOutput> {
    try {
      this.loggerService.trace("isTeamAdmin called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      const { teamUserRelationship } = await this.teamUserRelationshipService.getTeamUserRelationship({ teamId, userId });

      return { isTeamAdmin: teamUserRelationship.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isTeamAdmin: false };
      }
      this.loggerService.error("Error in isTeamAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamUserMediatorServiceInterface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput>;
  removeUserFromTeam(params: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput>;
  getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput>;
  getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput>;
  isTeamMember(params: IsTeamMemberInput): Promise<IsTeamMemberOutput>;
  isTeamAdmin(params: IsTeamAdminInput): Promise<IsTeamAdminOutput>;
}

export interface CreateTeamInput {
  name: string;
  createdBy: string;
}

export interface CreateTeamOutput {
  team: Team;
}

export interface AddUserToTeamInput {
  teamId: string;
  userId: string;
  role: Role;
}

export interface AddUserToTeamOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface RemoveUserFromTeamInput {
  teamId: string;
  userId: string;
}

export type RemoveUserFromTeamOutput = void;
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

export interface IsTeamMemberInput {
  teamId: string;
  userId: string;
}

export interface IsTeamMemberOutput {
  isTeamMember: boolean;
}

export interface IsTeamAdminInput {
  teamId: string;
  userId: string;
}

export interface IsTeamAdminOutput {
  isTeamAdmin: boolean;
}
