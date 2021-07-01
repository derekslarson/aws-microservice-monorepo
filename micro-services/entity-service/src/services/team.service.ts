import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface, Role, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { Team } from "../models/team.model";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { TeamUserRelationship } from "../models/team.user.relationship.model";

@injectable()
export class TeamService implements TeamServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.TeamRepositoryInterface) private teamRepository: TeamRepositoryInterface,
  ) {}

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { name, createdBy } = params;

      const teamId = `${KeyPrefix.Team}${this.idService.generateId()}`;

      const team: Team = {
        id: teamId,
        name,
        createdBy,
      };

      await this.teamRepository.createTeam({ team });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeam(params: GetTeamInput): Promise<GetTeamOutput> {
    try {
      this.loggerService.trace("getTeam called", { params }, this.constructor.name);

      const { teamId } = params;

      const { team } = await this.teamRepository.getTeam({ teamId });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeams(params: GetTeamsInput): Promise<GetTeamsOutput> {
    try {
      this.loggerService.trace("getTeam called", { params }, this.constructor.name);

      const { teamIds } = params;

      const { teams } = await this.teamRepository.getTeams({ teamIds });

      const teamMap = teams.reduce((acc: { [key: string]: Team; }, team) => {
        acc[team.id] = team;

        return acc;
      }, {});

      const sortedTeams = teamIds.map((teamId) => teamMap[teamId]);

      return { teams: sortedTeams };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  // public async addUserToTeam(addUserToTeamInput: AddUserToTeamInput): Promise<AddUserToTeamOutput> {
  //   try {
  //     this.loggerService.trace("addUserToTeam called", { addUserToTeamInput }, this.constructor.name);

  //     const { teamId, userId, role } = addUserToTeamInput;

  //     const teamUserRelationship: TeamUserRelationship = {
  //       teamId,
  //       userId,
  //       role,
  //     };

  //     await this.teamRepository.createTeamUserRelationship({ teamUserRelationship });

  //     return { teamUserRelationship };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in addUserToTeam", { error, addUserToTeamInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async removeUserFromTeam(removeUserFromTeamInput: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput> {
  //   try {
  //     this.loggerService.trace("removeUserFromTeam called", { removeUserFromTeamInput }, this.constructor.name);

  //     const { teamId, userId } = removeUserFromTeamInput;

  //     await this.teamRepository.deleteTeamUserRelationship({ teamId, userId });
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in removeUserFromTeam", { error, removeUserFromTeamInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getTeamsByUserId(getTeamsByUserIdInput: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getTeamsByUserId called", { getTeamsByUserIdInput }, this.constructor.name);

  //     const { userId } = getTeamsByUserIdInput;

  //     const { teams, lastEvaluatedKey } = await this.teamRepository.getTeamsByUserId({ userId });

  //     return { teams, lastEvaluatedKey };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getTeamsByUserId", { error, getTeamsByUserIdInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async isTeamMember(isTeamMemberInput: IsTeamMemberInput): Promise<IsTeamMemberOutput> {
  //   try {
  //     this.loggerService.trace("isTeamMember called", { isTeamMemberInput }, this.constructor.name);

  //     const { teamId, userId } = isTeamMemberInput;

  //     await this.teamRepository.getTeamUserRelationship({ teamId, userId });

  //     return { isTeamMember: true };
  //   } catch (error: unknown) {
  //     if (error instanceof NotFoundError) {
  //       return { isTeamMember: false };
  //     }

  //     this.loggerService.error("Error in isTeamMember", { error, isTeamMemberInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async isTeamAdmin(isTeamAdminInput: IsTeamAdminInput): Promise<IsTeamAdminOutput> {
  //   try {
  //     this.loggerService.trace("isTeamAdmin called", { isTeamAdminInput }, this.constructor.name);

  //     const { teamId, userId } = isTeamAdminInput;

  //     const { teamUserRelationship } = await this.teamRepository.getTeamUserRelationship({ teamId, userId });

  //     const isTeamAdmin = teamUserRelationship.role === Role.Admin;

  //     return { isTeamAdmin };
  //   } catch (error: unknown) {
  //     if (error instanceof NotFoundError) {
  //       return { isTeamAdmin: false };
  //     }

  //     this.loggerService.error("Error in isTeamAdmin", { error, isTeamAdminInput }, this.constructor.name);

  //     throw error;
  //   }
  // }
}

export interface TeamServiceInterface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  getTeams(params: GetTeamsInput): Promise<GetTeamsOutput>;
}

export interface CreateTeamInput {
  name: string;
  createdBy: string;
}

export interface CreateTeamOutput {
  team: Team;
}

export interface GetTeamInput {
  teamId: string;
}

export interface GetTeamOutput {
  team: Team;
}

export interface GetTeamsInput {
  teamIds: string[];
}

export interface GetTeamsOutput {
  teams: Team[];
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

export interface GetTeamsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetTeamsByUserIdOutput {
  teams: WithRole<Team>[];
  lastEvaluatedKey?: string;
}

export interface IsTeamMemberInput {
  userId: string;
  teamId: string;
}

export interface IsTeamMemberOutput {
  isTeamMember: boolean;
}

export interface IsTeamAdminInput {
  userId: string;
  teamId: string;
}

export interface IsTeamAdminOutput {
  isTeamAdmin: boolean;
}
