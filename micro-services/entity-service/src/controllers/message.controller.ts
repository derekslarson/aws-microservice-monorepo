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
export class MessageController extends BaseController implements MessageControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamUserMediatorServiceInterface) private teamUserMediatorService: TeamUserMediatorServiceInterface,
  ) {
    super();
  }

  public async createMessage(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createMessage called", { request }, this.constructor.name);

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
      this.loggerService.error("Error in createMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessage(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessage called", { request }, this.constructor.name);

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
      this.loggerService.error("Error in getMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateMessageByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateMessageByUserId called", { request }, this.constructor.name);

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
      this.loggerService.error("Error in updateMessageByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByConversationId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { request }, this.constructor.name);

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
      this.loggerService.error("Error in getMessagesByConversationId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface MessageControllerInterface {
  createMessage(request: Request): Promise<Response>;
  getMessage(request: Request): Promise<Response>;
  updateMessageByUserId(request: Request): Promise<Response>;
  getMessagesByConversationId(request: Request): Promise<Response>;
}
