import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { Role } from "@yac/util/src/enums/role.enum";
import { UserId } from "@yac/util/src/types/userId.type";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TeamId } from "@yac/util/src/types/teamId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { FileOperation } from "@yac/util/src/enums/fileOperation.enum";
import { WithRole } from "@yac/util/src/types/withRole.type";
import { RawTeam as RawTeamEntity, Team as TeamEntity, TeamRepositoryInterface, TeamUpdates } from "../../repositories/team.dynamo.repository";
import { TeamMembership as TeamMembershipEntity, MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { ImageFileRepositoryInterface } from "../../repositories/image.s3.repository";
import { TYPES } from "../../inversion-of-control/types";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MembershipType } from "../../enums/membershipType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";
import { MembershipFetchType } from "../../enums/membershipFetchType.enum";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { SearchIndex } from "../../enums/searchIndex.enum";

@injectable()
export class TeamService implements TeamServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.TeamRepositoryInterface) private teamRepository: TeamRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private teamSearchRepository: TeamSearchRepositoryInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { name, createdBy, organizationId } = params;

      const teamId: TeamId = `${KeyPrefix.Team}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const now = new Date().toISOString();

      const teamEntity: TeamEntity = {
        imageMimeType,
        id: teamId,
        organizationId,
        name,
        createdBy,
        createdAt: now,
        updatedAt: now,
      };

      await Promise.all([
        this.teamRepository.createTeam({ team: teamEntity }),
        this.addUserToTeam({ userId: createdBy, teamId, role: Role.Admin }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.Team, entityId: teamId, file: image, mimeType: imageMimeType }),
      ]);

      const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput> {
    try {
      this.loggerService.trace("updateTeam called", { params }, this.constructor.name);

      const { teamId, updates } = params;

      await this.teamRepository.updateTeam({ teamId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput> {
    try {
      this.loggerService.trace("addUserToTeam called", { params }, this.constructor.name);

      const { teamId, userId, role } = params;

      const now = new Date().toISOString();

      const membership: TeamMembership = {
        createdAt: now,
        activeAt: now,
        userId,
        entityId: teamId,
        type: MembershipType.Team,
        role,
      };

      await this.membershipRepository.createMembership({ membership });

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

      await this.membershipRepository.deleteMembership({ entityId: teamId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeam(params: GetTeamInput): Promise<GetTeamOutput> {
    try {
      this.loggerService.trace("getTeam called", { params }, this.constructor.name);

      const { teamId } = params;

      const { team: teamEntity } = await this.teamRepository.getTeam({ teamId });

      const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeams(params: GetTeamsInput): Promise<GetTeamsOutput> {
    try {
      this.loggerService.trace("getTeams called", { params }, this.constructor.name);

      const { teamIds } = params;

      const { teams } = await this.teamRepository.getTeams({ teamIds });

      const teamMap: Record<string, Team> = {};
      teams.forEach((teamEntity) => {
        const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

        teamMap[team.id] = team;
      });

      const sortedTeams = teamIds.map((teamId) => teamMap[teamId]);

      return { teams: sortedTeams };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeams", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.Team,
        exclusiveStartKey,
        limit,
      });

      const teamIds = memberships.map((membership) => membership.entityId);

      const { teams: teamEntities } = await this.teamRepository.getTeams({ teamIds });

      const teams = teamEntities.map((teamEntity, i) => {
        const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

        return {
          ...team,
          role: memberships[i].role,
        };
      });

      return { teams, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByOrganizationId(params: GetTeamsByOrganizationIdInput): Promise<GetTeamsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getTeamsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { teams: teamEntities, lastEvaluatedKey } = await this.teamRepository.getTeamsByOrganizationId({
        organizationId,
        exclusiveStartKey,
        limit,
      });

      const teams = teamEntities.map((teamEntity) => {
        const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

        return team;
      });

      return { teams, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsBySearchTerm(params: GetTeamsBySearchTermInput): Promise<GetTeamsBySearchTermOutput> {
    try {
      this.loggerService.trace("getTeamsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, teamIds, limit, exclusiveStartKey } = params;

      const { teams: teamEntities, lastEvaluatedKey } = await this.teamSearchRepository.getTeamsBySearchTerm({ searchTerm, teamIds, limit, exclusiveStartKey });

      const searchTeamIds = teamEntities.map((team) => team.id);

      const { teams } = await this.getTeams({ teamIds: searchTeamIds });

      return { teams, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getTeamImageUploadUrl(params: GetTeamImageUploadUrlInput): GetTeamImageUploadUrlOutput {
    try {
      this.loggerService.trace("getTeamImageUploadUrl called", { params }, this.constructor.name);

      const { teamId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileRepository.getSignedUrl({
        operation: FileOperation.Upload,
        entityType: EntityType.Team,
        entityId: teamId,
        mimeType,
      });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isTeamMember(params: IsTeamMemberInput): Promise<IsTeamMemberOutput> {
    try {
      this.loggerService.trace("isTeamMember called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      await this.membershipRepository.getMembership({ entityId: teamId, userId });

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

      const { membership } = await this.membershipRepository.getMembership({ entityId: teamId, userId });

      return { isTeamAdmin: membership.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isTeamAdmin: false };
      }
      this.loggerService.error("Error in isTeamAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexTeamForSearch(params: IndexTeamForSearchInput): Promise<IndexTeamForSearchOutput> {
    try {
      this.loggerService.trace("indexTeamForSearch called", { params }, this.constructor.name);

      const { team: rawTeam } = params;

      const { team } = this.teamRepository.convertRawTeamToTeam({ rawTeam });

      await this.teamSearchRepository.indexDocument({ index: SearchIndex.Team, document: team });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexTeamForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexTeamForSearch(params: DeindexTeamForSearchInput): Promise<DeindexTeamForSearchOutput> {
    try {
      this.loggerService.trace("deindexTeamForSearch called", { params }, this.constructor.name);

      const { teamId } = params;

      await this.teamSearchRepository.deindexDocument({ index: SearchIndex.Team, id: teamId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexTeamForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamServiceInterface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  getTeams(params: GetTeamsInput): Promise<GetTeamsOutput>;
  getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput>;
  getTeamsByOrganizationId(params: GetTeamsByOrganizationIdInput): Promise<GetTeamsByOrganizationIdOutput>;
  getTeamsBySearchTerm(params: GetTeamsBySearchTermInput): Promise<GetTeamsBySearchTermOutput>;
  getTeamImageUploadUrl(params: GetTeamImageUploadUrlInput): GetTeamImageUploadUrlOutput;
  addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput>;
  removeUserFromTeam(params: RemoveUserFromTeamInput): Promise<RemoveUserFromTeamOutput>;
  isTeamMember(params: IsTeamMemberInput): Promise<IsTeamMemberOutput>;
  isTeamAdmin(params: IsTeamAdminInput): Promise<IsTeamAdminOutput>;
  indexTeamForSearch(params: IndexTeamForSearchInput): Promise<IndexTeamForSearchOutput>;
  deindexTeamForSearch(params: DeindexTeamForSearchInput): Promise<DeindexTeamForSearchOutput>;
}

export type Team = Omit<TeamEntity, "imageMimeType"> & {
  image: string;
};

export type TeamByUserId = WithRole<Team>;

export interface CreateTeamInput {
  name: string;
  createdBy: UserId;
  organizationId: OrganizationId;
}

export interface CreateTeamOutput {
  team: Team;
}

export interface UpdateTeamInput {
  teamId: TeamId;
  updates: TeamUpdates;
}

export type UpdateTeamOutput = void;

export interface GetTeamInput {
  teamId: TeamId;
}

export interface GetTeamOutput {
  team: Team;
}

export interface GetTeamsInput {
  teamIds: TeamId[];
}

export interface GetTeamsOutput {
  teams: Team[];
}

export interface GetTeamImageUploadUrlInput {
  teamId: TeamId;
  mimeType: ImageMimeType;
}

export interface GetTeamImageUploadUrlOutput {
  uploadUrl: string;
}

export type TeamMembership = TeamMembershipEntity;

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
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsByUserIdOutput {
  teams: TeamByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetTeamsByOrganizationIdInput {
  organizationId: OrganizationId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsByOrganizationIdOutput {
  teams: Team[];
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

export interface IndexTeamForSearchInput {
  team: RawTeamEntity;
}

export type IndexTeamForSearchOutput = void;

export interface DeindexTeamForSearchInput {
  teamId: TeamId;
}

export type DeindexTeamForSearchOutput = void;

export interface GetTeamsBySearchTermInput {
  searchTerm: string;
  teamIds?: TeamId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsBySearchTermOutput {
  teams: Team[];
  lastEvaluatedKey?: string;
}

type TeamSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getTeamsBySearchTerm">;
