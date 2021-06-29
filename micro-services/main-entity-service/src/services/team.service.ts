import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface, NotFoundError, Role, WithRole } from "@yac/core";
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
  ) {
  }

  public async createTeam(createTeamInput: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { createTeamInput }, this.constructor.name);

      const { name, createdBy } = createTeamInput;

      const teamId = `${KeyPrefix.Team}${this.idService.generateId()}`;

      const team: Team = {
        id: teamId,
        name,
        createdBy,
      };

      await this.teamRepository.createTeam({ team });

      await this.addUserToTeam({ teamId, userId: createdBy, role: Role.Admin });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, createTeamInput }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToTeam(addUserToTeamInput: AddUserToTeamInput): Promise<AddUserToTeamOutput> {
    try {
      this.loggerService.trace("addUserToTeam called", { addUserToTeamInput }, this.constructor.name);

      const { teamId, userId, role } = addUserToTeamInput;

      const teamUserRelationship: TeamUserRelationship = {
        teamId,
        userId,
        role,
      };

      await this.teamRepository.createTeamUserRelationship({ teamUserRelationship });

      return { teamUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, addUserToTeamInput }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromTeam(removeUserFromTeamInput: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { removeUserFromTeamInput }, this.constructor.name);

      const { teamId, userId } = removeUserFromTeamInput;

      await this.teamRepository.deleteTeamUserRelationship({ teamId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, removeUserFromTeamInput }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByUserId(getTeamsByUserIdInput: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { getTeamsByUserIdInput }, this.constructor.name);

      const { userId } = getTeamsByUserIdInput;

      const { teams, lastEvaluatedKey } = await this.teamRepository.getTeamsByUserId({ userId });

      return { teams, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, getTeamsByUserIdInput }, this.constructor.name);

      throw error;
    }
  }

  public async isTeamMember(isTeamMemberInput: IsTeamMemberInput): Promise<IsTeamMemberOutput> {
    try {
      this.loggerService.trace("isTeamMember called", { isTeamMemberInput }, this.constructor.name);

      const { teamId, userId } = isTeamMemberInput;

      await this.teamRepository.getTeamUserRelationship({ teamId, userId });

      return { isTeamMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isTeamMember: false };
      }

      this.loggerService.error("Error in isTeamMember", { error, isTeamMemberInput }, this.constructor.name);

      throw error;
    }
  }

  public async isTeamAdmin(isTeamAdminInput: IsTeamAdminInput): Promise<IsTeamAdminOutput> {
    try {
      this.loggerService.trace("isTeamAdmin called", { isTeamAdminInput }, this.constructor.name);

      const { teamId, userId } = isTeamAdminInput;

      const { teamUserRelationship } = await this.teamRepository.getTeamUserRelationship({ teamId, userId });

      const isTeamAdmin = teamUserRelationship.role === Role.Admin;

      return { isTeamAdmin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isTeamAdmin: false };
      }

      this.loggerService.error("Error in isTeamAdmin", { error, isTeamAdminInput }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamServiceInterface {
  createTeam(createTeamInput: CreateTeamInput): Promise<CreateTeamOutput>;
  addUserToTeam(addUserToTeamInput: AddUserToTeamInput): Promise<AddUserToTeamOutput>;
  removeUserFromTeam(removeUserFromTeamInput: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput>;
  getTeamsByUserId(getTeamsByUserIdInput: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput>;
  isTeamMember(isTeamMemberInput: IsTeamMemberInput): Promise<IsTeamMemberOutput>;
  isTeamAdmin(isTeamAdminInput: IsTeamAdminInput): Promise<IsTeamAdminOutput>;
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
