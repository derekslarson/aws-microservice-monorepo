import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { TeamCreationBodyDto } from "../models/team/team.creation.input.model";
import { Team } from "../models/team/team.model";
@injectable()
export class TeamService implements TeamServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamRepositoryInterface) private teamRepository: TeamRepositoryInterface,
  ) {
  }

  public async createTeam(teamCreationInput: TeamCreationBodyDto, userId: string): Promise<Team> {
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

  public async addUserToTeam(teamId: string, userId: string, role: Role): Promise<void> {
    try {
      this.loggerService.trace("addUserToTeam called", { teamId, userId, role }, this.constructor.name);

      await this.teamRepository.addUserToTeam(teamId, userId, role);
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, teamId, userId, role }, this.constructor.name);

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

  public async getTeamsByUserId(userId: string): Promise<Team[]> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { userId }, this.constructor.name);

      const { teams } = await this.teamRepository.getTeamsByUserId(userId);

      return teams;
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      this.loggerService.trace("isTeamMember called", { teamId, userId }, this.constructor.name);

      await this.teamRepository.getTeamUserRelationship(teamId, userId);

      return true;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return false;
      }

      this.loggerService.error("Error in isTeamMember", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
    try {
      this.loggerService.trace("isTeamAdmin called", { teamId, userId }, this.constructor.name);

      const relationship = await this.teamRepository.getTeamUserRelationship(teamId, userId);

      return relationship.role === Role.Admin;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return false;
      }

      this.loggerService.error("Error in isTeamAdmin", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamServiceInterface {
  createTeam(TeamCreationInput: TeamCreationBodyDto, userId: string): Promise<Team>;
  addUserToTeam(teamId: string, userId: string, role: Role): Promise<void>;
  removeUserFromTeam(teamId: string, userId: string): Promise<void>;
  getTeamsByUserId(teamId: string): Promise<Team[]>;
  isTeamMember(teamId: string, userId: string): Promise<boolean>;
  isTeamAdmin(teamId: string, userId: string): Promise<boolean>;
}
