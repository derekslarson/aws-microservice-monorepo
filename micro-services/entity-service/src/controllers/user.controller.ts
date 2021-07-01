// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface } from "../services/user.service";
import { GetUsersByTeamIdRequestDto } from "../dtos/users.getByTeamId.dto";
import { TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";
import { GetUserRequestDto } from "../dtos/user.get.dto";
import { ConversationUserMediatorServiceInterface } from "../mediator-services/conversation.user.mediator.service";
import { GetUsersByConversationIdRequestDto } from "../dtos/users.getByConversationId.dto";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamUserMediatorServiceInterface) private teamUserMediatorService: TeamUserMediatorServiceInterface,
    @inject(TYPES.ConversationUserMediatorServiceInterface) private conversationUserMediatorService: ConversationUserMediatorServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
  ) {
    super();
  }

  public async getUser(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUser called", { request }, this.constructor.name);

      const { pathParameters: { userId } } = this.validationService.validate(GetUserRequestDto, request);

      const { user } = await this.userService.getUser({ userId });

      return this.generateSuccessResponse({ user });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { pathParameters: { teamId } } = this.validationService.validate(GetUsersByTeamIdRequestDto, request);

      const { isTeamMember } = await this.teamUserMediatorService.isTeamMember({ teamId, userId: authUserId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.teamUserMediatorService.getUsersByTeamId({ teamId });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByConversationId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByConversationId called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { pathParameters: { conversationId } } = this.validationService.validate(GetUsersByConversationIdRequestDto, request);

      const { isConversationMember } = await this.conversationUserMediatorService.isConversationMember({ conversationId, userId: authUserId });

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.conversationUserMediatorService.getUsersByConversationId({ conversationId });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  getUsersByTeamId(request: Request): Promise<Response>;
  getUsersByConversationId(request: Request): Promise<Response>;
  getUser(request: Request): Promise<Response>;
}
