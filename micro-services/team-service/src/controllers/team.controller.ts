// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion, ForbiddenError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface } from "../services/team.service";
import { TeamCreationBodyInputDto } from "../models/team.creation.input.model";
import { TeamAddMemberBodyInputDto, TeamAddMemberPathParametersInputDto } from "../models/team.addMember.input.model";
import { TeamRemoveMemberBodyInputDto, TeamRemoveMemberPathParametersInputDto } from "../models/team.removeMember.input.model";
import { UsersGetByTeamIdPathParametersInputDto } from "../models/users.getByTeamId.input.model";

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
      this.loggerService.trace("createTeam called", { request }, this.constructor.name);

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
      this.loggerService.error("Error in createTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createTeam called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const [ { teamId }, { userId } ] = await Promise.all([
        this.validationService.validate(TeamRemoveMemberPathParametersInputDto, RequestPortion.PathParameters, request.pathParameters),
        this.validationService.validate(TeamRemoveMemberBodyInputDto, RequestPortion.Body, request.body),
      ]);

      const isTeamAdmin = await this.teamService.isTeamAdmin(teamId, authUserId);

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamService.removeUserFromTeam(teamId, userId);

      return this.generateSuccessResponse({ message: "user removed from team" });
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createTeam called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { teamId } = await this.validationService.validate(UsersGetByTeamIdPathParametersInputDto, RequestPortion.PathParameters, request.pathParameters);

      const isTeamMember = await this.teamService.isTeamMember(teamId, authUserId);

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const users = await this.teamService.getUsersByTeamId(teamId);

      return this.generateSuccessResponse({ users });
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface TeamControllerInterface {
  createTeam(request: Request): Promise<Response>;
  addUserToTeam(request: Request): Promise<Response>;
  removeUserFromTeam(request: Request): Promise<Response>;
  getUsersByTeamId(request: Request): Promise<Response>;
}
