import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface } from "../services/team.service";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { CreateTeamDto } from "../dtos/createTeam.dto";
import { GetTeamDto } from "../dtos/getTeam.dto";
import { AddUserToTeamDto } from "../dtos/addUserToTeam.dto";
import { RemoveUserFromTeamDto } from "../dtos/removeUserFromTeam.dto";
import { GetTeamsByUserIdDto } from "../dtos/getTeamsByUserId.dto";
import { GetUsersByTeamIdDto } from "../dtos/getUsersByTeamId.dto";

@injectable()
export class TeamController extends BaseController implements TeamControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
  ) {
    super();
  }

  public async createTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { name },
      } = this.validationService.validate({ dto: CreateTeamDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { team } = await this.teamMediatorService.createTeam({ name, createdBy: userId });

      return this.generateCreatedResponse({ team });
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
      } = this.validationService.validate({ dto: GetTeamDto, request, getUserIdFromJwt: true });

      const { isTeamMember } = await this.teamMediatorService.isTeamMember({ teamId, userId: jwtId });

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

      const {
        jwtId,
        pathParameters: { teamId },
        body: { userId, role },
      } = this.validationService.validate({ dto: AddUserToTeamDto, request, getUserIdFromJwt: true });

      const { isTeamAdmin } = await this.teamMediatorService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamMediatorService.addUserToTeam({ teamId, userId, role });

      return this.generateSuccessResponse({ message: "user added to team" });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId, userId },
      } = this.validationService.validate({ dto: RemoveUserFromTeamDto, request, getUserIdFromJwt: true });

      const { isTeamAdmin } = await this.teamMediatorService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamMediatorService.removeUserFromTeam({ teamId, userId });

      return this.generateSuccessResponse({ message: "user removed from team" });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeamsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { exclusiveStartKey },
      } = this.validationService.validate({ dto: GetTeamsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { teams, lastEvaluatedKey } = await this.teamMediatorService.getTeamsByUserId({ userId, exclusiveStartKey });

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
