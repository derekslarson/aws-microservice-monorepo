// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion, ForbiddenError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface } from "../services/team.service";
import { TeamCreationBodyDto, TeamCreationPathParametersDto } from "../dtos/team.creation.dto";
import { TeamAddUserBodyDto, TeamAddUserPathParametersDto } from "../dtos/team.addUser.dto";
import { TeamRemoveUserPathParametersDto } from "../dtos/team.removeUser.dto";
import { TeamsGetByUserIdPathParametersDto } from "../dtos/teams.getByUserId.dto";
import { TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";
import { TeamGetPathParametersDto } from "../dtos/team.get.dto";
@injectable()
export class TeamController extends BaseController implements TeamControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
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

      const [ { userId }, { name } ] = await Promise.all([
        this.validationService.validate(TeamCreationPathParametersDto, RequestPortion.PathParameters, request.pathParameters),
        this.validationService.validate(TeamCreationBodyDto, RequestPortion.Body, request.body),
      ]);

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

      const { teamId } = await this.validationService.validate(TeamGetPathParametersDto, RequestPortion.PathParameters, request.pathParameters);

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

      const [ { teamId }, { userId, role } ] = await Promise.all([
        this.validationService.validate(TeamAddUserPathParametersDto, RequestPortion.PathParameters, request.pathParameters),
        this.validationService.validate(TeamAddUserBodyDto, RequestPortion.Body, request.body),
      ]);

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

      const { teamId, userId } = await this.validationService.validate(TeamRemoveUserPathParametersDto, RequestPortion.PathParameters, request.pathParameters);

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

      const { userId } = await this.validationService.validate(TeamsGetByUserIdPathParametersDto, RequestPortion.PathParameters, request.pathParameters);

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
