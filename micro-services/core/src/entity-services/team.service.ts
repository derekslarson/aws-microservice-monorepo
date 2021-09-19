import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { TeamRepositoryInterface, Team as TeamEntity, TeamUpdates, RawTeam } from "../repositories/team.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { TeamId } from "../types/teamId.type";
import { UserId } from "../types/userId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";
import { EntityType } from "../enums/entityType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";

@injectable()
export class TeamService implements TeamServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.TeamRepositoryInterface) private teamRepository: TeamRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private teamSearchRepository: TeamSearchRepositoryInterface,
  ) {}

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { name, createdBy } = params;

      const teamId: TeamId = `${KeyPrefix.Team}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const teamEntity: TeamEntity = {
        id: teamId,
        imageMimeType,
        name,
        createdBy,
      };

      await this.teamRepository.createTeam({ team: teamEntity });

      await Promise.all([
        this.imageFileRepository.uploadFile({ entityType: EntityType.Team, entityId: teamId, file: image, mimeType: imageMimeType }),
        this.teamRepository.createTeam({ team: teamEntity }),
      ]);

      const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

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

      const { team: teamEntity } = await this.teamRepository.getTeam({ teamId });

      const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput> {
    try {
      this.loggerService.trace("updateTeam called", { params }, this.constructor.name);

      const { teamId, updates } = params;

      const { team: teamEntity } = await this.teamRepository.updateTeam({ teamId, updates });

      const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeams(params: GetTeamsInput): Promise<GetTeamsOutput> {
    try {
      this.loggerService.trace("getTeam called", { params }, this.constructor.name);

      const { teamIds } = params;

      const { teams } = await this.teamRepository.getTeams({ teamIds });

      const teamMap: Record<string, Team> = {};
      teams.forEach((teamEntity) => {
        const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });
        teamMap[teamEntity.id] = team;
      });

      const sortedTeams = teamIds.map((teamId) => teamMap[teamId]);

      return { teams: sortedTeams };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getTeamImageUploadUrl(params: GetTeamImageUploadUrlInput): GetTeamImageUploadUrlOutput {
    try {
      this.loggerService.trace("getTeamImageUploadUrl called", { params }, this.constructor.name);

      const { teamId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileRepository.getSignedUrl({
        operation: "upload",
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

  public async indexTeamForSearch(params: IndexTeamForSearchInput): Promise<IndexTeamForSearchOutput> {
    try {
      this.loggerService.trace("indexTeamForSearch called", { params }, this.constructor.name);

      const { team } = params;

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

  public async getTeamsBySearchTerm(params: GetTeamsBySearchTermInput): Promise<GetTeamsBySearchTermOutput> {
    try {
      this.loggerService.trace("getTeamsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, teamIds, limit, exclusiveStartKey } = params;

      const { teams: teamEntities, lastEvaluatedKey } = await this.teamSearchRepository.getTeamsBySearchTerm({ searchTerm, teamIds, limit, exclusiveStartKey });

      const teams = teamEntities.map((teamEntity) => {
        const { entity: team } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Team, entity: teamEntity });

        return team;
      }, {});

      return { teams, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface Team extends Omit<TeamEntity, "imageMimeType"> {
  image: string;
}
export interface TeamServiceInterface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput>;
  getTeams(params: GetTeamsInput): Promise<GetTeamsOutput>;
  getTeamImageUploadUrl(params: GetTeamImageUploadUrlInput): GetTeamImageUploadUrlOutput;
  indexTeamForSearch(params: IndexTeamForSearchInput): Promise<IndexTeamForSearchOutput>;
  deindexTeamForSearch(params: DeindexTeamForSearchInput): Promise<DeindexTeamForSearchOutput>;
  getTeamsBySearchTerm(params: GetTeamsBySearchTermInput): Promise<GetTeamsBySearchTermOutput>;
}

export interface CreateTeamInput {
  name: string;
  createdBy: UserId;
}

export interface CreateTeamOutput {
  team: Team;
}

export interface GetTeamInput {
  teamId: TeamId;
}

export interface GetTeamOutput {
  team: Team;
}

export interface UpdateTeamInput {
  teamId: TeamId;
  updates: TeamUpdates;
}

export interface UpdateTeamOutput {
  team: Team;
}

export interface GetTeamsInput {
  teamIds: TeamId[];
}

export interface GetTeamsOutput {
  teams: Team[];
}

export interface IndexTeamForSearchInput {
  team: RawTeam;
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

export interface GetTeamImageUploadUrlInput {
  teamId: TeamId;
  mimeType: ImageMimeType;
}

export interface GetTeamImageUploadUrlOutput {
  uploadUrl: string;
}

type TeamSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getTeamsBySearchTerm">;
