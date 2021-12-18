import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, OrganizationId, Role, TeamId, UserId, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface, Team as TeamEntity } from "../entity-services/team.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { Membership as MembershipEntity, MembershipServiceInterface } from "../entity-services/membership.service";
import { MembershipType } from "../enums/membershipType.enum";
import { MembershipFetchType } from "../enums/membershipFetchType.enum";

@injectable()
export class TeamMediatorService implements TeamMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { name, createdBy, organizationId } = params;

      const { team: teamEntity } = await this.teamService.createTeam({ name, createdBy, organizationId });

      const { membership } = await this.membershipService.createMembership({
        type: MembershipType.Team,
        entityId: teamEntity.id,
        userId: createdBy,
        role: Role.Admin,
      });

      const team: WithRole<Team> = {
        ...teamEntity,
        role: membership.role,
      };

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput> {
    try {
      this.loggerService.trace("updateTeam called", { params }, this.constructor.name);

      const { teamId, name } = params;

      await this.teamService.updateTeam({ teamId, updates: { name } });

      return;
    } catch (error: unknown) {
      this.loggerService.error("Error in updateTeam", { error, params }, this.constructor.name);

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

      const { membership } = await this.membershipService.createMembership({
        type: MembershipType.Team,
        entityId: teamId,
        userId,
        role,
      });

      return { teamMembership: membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromTeam(params: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      await this.membershipService.deleteMembership({ entityId: teamId, userId });
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

      const { memberships, lastEvaluatedKey } = await this.membershipService.getMembershipsByUserId({ userId, type: MembershipFetchType.Team, exclusiveStartKey, limit });

      const teamIds = memberships.map((relationship) => relationship.entityId);

      const { teams } = await this.teamService.getTeams({ teamIds });

      const teamsWithRoles = teams.map((team, i) => ({
        ...team,
        role: memberships[i].role,
      }));

      return { teams: teamsWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByOrganizationId(params: GetTeamsByOrganizationIdInput): Promise<GetTeamsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getTeamsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { teams, lastEvaluatedKey } = await this.teamService.getTeamsByOrganizationId({ organizationId, exclusiveStartKey, limit });

      return { teams, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isTeamMember(params: IsTeamMemberInput): Promise<IsTeamMemberOutput> {
    try {
      this.loggerService.trace("isTeamMember called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      await this.membershipService.getMembership({ entityId: teamId, userId });

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

      const { membership } = await this.membershipService.getMembership({ entityId: teamId, userId });

      return { isTeamAdmin: membership.role === Role.Admin };
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
  updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput>;
  removeUserFromTeam(params: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput>;
  getTeamImageUploadUrl(params: GetTeamImageUploadUrlInput): GetTeamImageUploadUrlOutput;
  getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput>;
  getTeamsByOrganizationId(params: GetTeamsByOrganizationIdInput): Promise<GetTeamsByOrganizationIdOutput>
  isTeamMember(params: IsTeamMemberInput): Promise<IsTeamMemberOutput>;
  isTeamAdmin(params: IsTeamAdminInput): Promise<IsTeamAdminOutput>;
}
export interface Team extends Omit<TeamEntity, "imageMimeType"> {
  image: string;
}

export type TeamMembership = MembershipEntity;

export interface CreateTeamInput {
  name: string;
  createdBy: UserId;
  organizationId: OrganizationId;
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

export type UpdateTeamInput = Pick<Team, "name"> & {
  teamId: TeamId;
};

export type UpdateTeamOutput = void;

export interface AddUserToTeamInput {
  teamId: TeamId;
  userId: UserId;
  role: Role;
}

export interface AddUserToTeamOutput {
  teamMembership: TeamMembership;
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

export interface GetTeamsByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsByOrganizationIdOutput {
  teams: Team[];
  lastEvaluatedKey?: string;
}
