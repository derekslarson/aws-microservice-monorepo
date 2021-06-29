// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion, ForbiddenError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface } from "../services/team.service";
import { TeamCreationBodyInputDto } from "../models/team/team.creation.input.model";
import { TeamAddMemberBodyInputDto, TeamAddMemberPathParametersInputDto } from "../models/team/team.addMember.input.model";
import { TeamRemoveMemberPathParametersInputDto } from "../models/team/team.removeMember.input.model";
import { TeamsGetByUserIdPathParametersInputDto } from "../models/team/teams.getByUserId.input.model";

@injectable()
export class TeamController extends BaseController implements TeamControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
  ) {
    super();
  }

  public async createTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createTeam called", { request }, this.constructor.name);

      const userId = this.getUserIdFromRequestWithJwt(request);

      const teamCreationInput = await this.validationService.validate(TeamCreationBodyInputDto, RequestPortion.Body, request.body);

      const team = await this.teamService.createTeam(teamCreationInput, userId);

      return this.generateCreatedResponse(team);
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUserToTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserToTeam called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const [ { teamId }, { userId, role } ] = await Promise.all([
        this.validationService.validate(TeamAddMemberPathParametersInputDto, RequestPortion.PathParameters, request.pathParameters),
        this.validationService.validate(TeamAddMemberBodyInputDto, RequestPortion.Body, request.body),
      ]);

      const isTeamAdmin = await this.teamService.isTeamAdmin(teamId, authUserId);

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamService.addUserToTeam(teamId, userId, role);

      return this.generateSuccessResponse({ message: "user added to team" });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { teamId, userId } = await this.validationService.validate(TeamRemoveMemberPathParametersInputDto, RequestPortion.PathParameters, request.pathParameters);

      const isTeamAdmin = await this.teamService.isTeamAdmin(teamId, authUserId);

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamService.removeUserFromTeam(teamId, userId);

      return this.generateSuccessResponse({ message: "user removed from team" });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeamsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { userId } = await this.validationService.validate(TeamsGetByUserIdPathParametersInputDto, RequestPortion.PathParameters, request.pathParameters);

      if (authUserId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const teams = await this.teamService.getTeamsByUserId(userId);

      return this.generateSuccessResponse({ teams });
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface TeamControllerInterface {
  createTeam(request: Request): Promise<Response>;
  addUserToTeam(request: Request): Promise<Response>;
  removeUserFromTeam(request: Request): Promise<Response>;
  getTeamsByUserId(request: Request): Promise<Response>;
}
