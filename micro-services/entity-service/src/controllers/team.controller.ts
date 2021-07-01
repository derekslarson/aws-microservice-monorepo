// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface } from "../services/team.service";
import { AddUserToTeamDto } from "../dtos/team.addUser.dto";
import { RemoveUserFromTeamDto } from "../dtos/team.removeUser.dto";
import { TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";
import { GetTeamRequestDto } from "../dtos/team.get.dto";
import { CreateTeamRequestDto } from "../dtos/team.creation.dto";
import { GetTeamsByUserIdRequestDto } from "../dtos/teams.getByUserId.dto";
@injectable()
export class TeamController extends BaseController implements TeamControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamUserMediatorServiceInterface) private teamUserMediatorService: TeamUserMediatorServiceInterface,
  ) {
    super();
  }

  public async createTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createTeam called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const {
        pathParameters: { userId },
        body: { name },
      } = this.validationService.validate(CreateTeamRequestDto, request);

      if (authUserId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { team } = await this.teamUserMediatorService.createTeam({ name, createdBy: userId });

      return this.generateCreatedResponse({ team });
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeam called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { pathParameters: { teamId } } = this.validationService.validate(GetTeamRequestDto, request);

      const { isTeamMember } = await this.teamUserMediatorService.isTeamMember({ teamId, userId: authUserId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { team } = await this.teamService.getTeam({ teamId });

      return this.generateSuccessResponse({ team });
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUserToTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserToTeam called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const {
        pathParameters: { teamId },
        body: { userId, role },
      } = this.validationService.validate(AddUserToTeamDto, request);

      const { isTeamAdmin } = await this.teamUserMediatorService.isTeamAdmin({ teamId, userId: authUserId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamUserMediatorService.addUserToTeam({ teamId, userId, role });

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

      const { pathParameters: { teamId, userId } } = this.validationService.validate(RemoveUserFromTeamDto, request);

      const { isTeamAdmin } = await this.teamUserMediatorService.isTeamAdmin({ teamId, userId: authUserId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamUserMediatorService.removeUserFromTeam({ teamId, userId });

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

      const { pathParameters: { userId } } = this.validationService.validate(GetTeamsByUserIdRequestDto, request);

      if (authUserId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { teams, lastEvaluatedKey } = await this.teamUserMediatorService.getTeamsByUserId({ userId });

      return this.generateSuccessResponse({ teams, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface TeamControllerInterface {
  createTeam(request: Request): Promise<Response>;
  getTeam(request: Request): Promise<Response>;
  addUserToTeam(request: Request): Promise<Response>;
  removeUserFromTeam(request: Request): Promise<Response>;
  getTeamsByUserId(request: Request): Promise<Response>;
}
