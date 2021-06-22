import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { TeamCreationInputDto } from "../models/team.creation.input.model";
import { Team } from "../models/team.model";

@injectable()
export class TeamService implements TeamServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamRepositoryInterface) private teamRepository: TeamRepositoryInterface,
  ) {
  }

  public async createTeam(teamCreationInput: TeamCreationInputDto, userId: string): Promise<Team> {
    try {
      this.loggerService.trace("createTeam called", { teamCreationInput, userId }, this.constructor.name);

      const team: Omit<Team, "id"> = {
        name: teamCreationInput.name,
        createdBy: userId,
      };

      const createdTeam = await this.teamRepository.createTeam(team);

      return createdTeam;
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, teamCreationInput, userId }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToTeam(teamId: string, userId: string): Promise<void> {
    try {
      this.loggerService.trace("addUserToTeam called", { teamId, userId }, this.constructor.name);

      await this.teamRepository.addUserToTeam(teamId, userId);
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromTeam(teamId: string, userId: string): Promise<void> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { teamId, userId }, this.constructor.name);

      await this.teamRepository.removeUserFromTeam(teamId, userId);
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByTeamId(teamId: string): Promise<string[]> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { teamId }, this.constructor.name);

      const userIds = await this.teamRepository.getUsersByTeamId(teamId);

      return userIds;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamServiceInterface {
  createTeam(TeamCreationInput: TeamCreationInputDto, userId: string): Promise<Team>;
  addUserToTeam(teamId: string, userId: string): Promise<void>;
  removeUserFromTeam(teamId: string, userId: string): Promise<void>;
  getUsersByTeamId(teamId: string): Promise<string[]>;
}
