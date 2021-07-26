import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamRepositoryInterface, Team as TeamEntity, TeamUpdates } from "../repositories/team.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { TeamId } from "../types/teamId.type";
import { UserId } from "../types/userId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";

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

      const { imageMimeType, name, createdBy } = params;

      const teamId: TeamId = `${KeyPrefix.Team}${this.idService.generateId()}`;

      const team: TeamEntity = {
        id: teamId,
        imageMimeType,
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

  public async updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput> {
    try {
      this.loggerService.trace("updateTeam called", { params }, this.constructor.name);

      const { teamId, updates } = params;

      const { team } = await this.teamRepository.updateTeam({ teamId, updates });

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

      const teamMap = teams.reduce((acc: { [key: string]: TeamEntity; }, team) => {
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
}

export type Team = TeamEntity;

export interface TeamServiceInterface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput>;
  getTeams(params: GetTeamsInput): Promise<GetTeamsOutput>;
}

export interface CreateTeamInput {
  imageMimeType: ImageMimeType;
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
