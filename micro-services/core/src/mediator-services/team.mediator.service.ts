import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface, Team as TeamEntity } from "../entity-services/team.service";
import { TeamUserRelationshipServiceInterface, TeamUserRelationship as TeamUserRelationshipEntity } from "../entity-services/teamUserRelationship.service";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";

@injectable()
export class TeamMediatorService implements TeamMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamUserRelationshipServiceInterface) private teamUserRelationshipService: TeamUserRelationshipServiceInterface,
  ) {}

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { name, createdBy } = params;

      const { team: teamEntity } = await this.teamService.createTeam({
        name,
        createdBy,
      });

      const { teamUserRelationship } = await this.teamUserRelationshipService.createTeamUserRelationship({ teamId: teamEntity.id, userId: createdBy, role: Role.Admin });

      const team: WithRole<Team> = {
        ...teamEntity,
        role: teamUserRelationship.role,
      };

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

      const { team } = await this.teamService.getTeam({ teamId });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

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

  public getTeamImageUploadUrl(params: GetTeamImageUploadUrlInput): GetTeamImageUploadUrlOutput {
    try {
      this.loggerService.trace("getTeamImageUploadUrl called", { params }, this.constructor.name);

      const { teamId, mimeType } = params;

      const { uploadUrl } = this.teamService.getTeamImageUploadUrl({ teamId, mimeType });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { teamUserRelationships, lastEvaluatedKey } = await this.teamUserRelationshipService.getTeamUserRelationshipsByUserId({ userId, exclusiveStartKey, limit });

      const teamIds = teamUserRelationships.map((relationship) => relationship.teamId);

      const { teams } = await this.teamService.getTeams({ teamIds });

      const teamsWithRoles = teams.map((team, i) => ({
        ...team,
        role: teamUserRelationships[i].role,
      }));

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

export interface TeamMediatorServiceInterface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput>;
  removeUserFromTeam(params: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput>;
  getTeamImageUploadUrl(params: GetTeamImageUploadUrlInput): GetTeamImageUploadUrlOutput;
  getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput>;
  isTeamMember(params: IsTeamMemberInput): Promise<IsTeamMemberOutput>;
  isTeamAdmin(params: IsTeamAdminInput): Promise<IsTeamAdminOutput>;
}
export interface Team extends Omit<TeamEntity, "imageMimeType"> {
  image: string;
}

export type TeamUserRelationship = TeamUserRelationshipEntity;

export interface CreateTeamInput {
  name: string;
  createdBy: UserId;
}

export interface CreateTeamOutput {
  team: WithRole<Team>;
}

export interface GetTeamInput {
  teamId: TeamId;
}

export interface GetTeamOutput {
  team: Team;
}

export interface AddUserToTeamInput {
  teamId: TeamId;
  userId: UserId;
  role: Role;
}

export interface AddUserToTeamOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface RemoveUserFromTeamInput {
  teamId: TeamId;
  userId: UserId;
}

export type RemoveUserFromTeamOutput = void;

export interface GetTeamsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsByUserIdOutput {
  teams: WithRole<Team>[];
  lastEvaluatedKey?: string;
}

export interface IsTeamMemberInput {
  teamId: TeamId;
  userId: UserId;
}

export interface IsTeamMemberOutput {
  isTeamMember: boolean;
}

export interface IsTeamAdminInput {
  teamId: TeamId;
  userId: UserId;
}

export interface IsTeamAdminOutput {
  isTeamAdmin: boolean;
}

export interface GetTeamImageUploadUrlInput {
  teamId: TeamId;
  mimeType: ImageMimeType;
}

export interface GetTeamImageUploadUrlOutput {
  uploadUrl: string;
}
