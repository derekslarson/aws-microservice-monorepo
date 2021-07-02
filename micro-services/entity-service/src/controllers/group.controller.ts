import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface } from "../services/team.service";
import { AddUserToTeamDto } from "../dtos/team.addUser.dto";
import { RemoveUserFromTeamDto } from "../dtos/team.removeUser.dto";
import { TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";
import { GetTeamRequestDto } from "../dtos/team.get.dto";
import { CreateTeamRequestDto } from "../dtos/team.create.dto";
import { GetTeamsByUserIdRequestDto } from "../dtos/teams.getByUserId.dto";
@injectable()
export class GroupController extends BaseController implements GroupControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamUserMediatorServiceInterface) private teamUserMediatorService: TeamUserMediatorServiceInterface,
  ) {
    super();
  }

  public async createGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { name },
      } = this.validationService.validate(CreateTeamRequestDto, request, true);

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { team } = await this.teamUserMediatorService.createTeam({ name, createdBy: userId });

      return this.generateCreatedResponse({ team });
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
      } = this.validationService.validate(GetTeamRequestDto, request, true);

      const { isTeamMember } = await this.teamUserMediatorService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { team } = await this.teamService.getTeam({ teamId });

      return this.generateSuccessResponse({ team });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUserToGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserToGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
        body: { userId, role },
      } = this.validationService.validate(AddUserToTeamDto, request, true);

      const { isTeamAdmin } = await this.teamUserMediatorService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamUserMediatorService.addUserToTeam({ teamId, userId, role });

      return this.generateSuccessResponse({ message: "user added to team" });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserFromGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId, userId },
      } = this.validationService.validate(RemoveUserFromTeamDto, request, true);

      const { isTeamAdmin } = await this.teamUserMediatorService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamUserMediatorService.removeUserFromTeam({ teamId, userId });

      return this.generateSuccessResponse({ message: "user removed from team" });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroupsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroupsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
      } = this.validationService.validate(GetTeamsByUserIdRequestDto, request, true);

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { teams, lastEvaluatedKey } = await this.teamUserMediatorService.getTeamsByUserId({ userId });

      return this.generateSuccessResponse({ teams, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroupsByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
      } = this.validationService.validate(GetTeamsByUserIdRequestDto, request, true);

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { teams, lastEvaluatedKey } = await this.teamUserMediatorService.getTeamsByUserId({ userId });

      return this.generateSuccessResponse({ teams, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface GroupControllerInterface {
  createGroup(request: Request): Promise<Response>;
  getGroup(request: Request): Promise<Response>;
  addUserToGroup(request: Request): Promise<Response>;
  removeUserFromGroup(request: Request): Promise<Response>;
  getGroupsByUserId(request: Request): Promise<Response>;
  getGroupsByTeamId(request: Request): Promise<Response>;
}
