import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface } from "../services/user.service";
import { GetUsersByTeamIdRequestDto } from "../dtos/getUsersByTeamId.dto";
import { TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";
import { ConversationUserMediatorServiceInterface } from "../mediator-services/conversation.user.mediator.service";
import { GetUsersByConversationIdRequestDto } from "../dtos/getUsersByConversationId.dto";

@injectable()
export class FriendController extends BaseController implements FriendControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamUserMediatorServiceInterface) private teamUserMediatorService: TeamUserMediatorServiceInterface,
    @inject(TYPES.ConversationUserMediatorServiceInterface) private conversationUserMediatorService: ConversationUserMediatorServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
  ) {
    super();
  }

  public async addUserAsFriend(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserAsFriend called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { conversationId },
      } = this.validationService.validate(GetUsersByConversationIdRequestDto, request, true);

      const { isConversationMember } = await this.conversationUserMediatorService.isConversationMember({ conversationId, userId: jwtId });

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.conversationUserMediatorService.getUsersByConversationId({ conversationId });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserAsFriend", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserAsFriend(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserAsFriend called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
      } = this.validationService.validate(GetUsersByTeamIdRequestDto, request, true);

      const { isTeamMember } = await this.teamUserMediatorService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.teamUserMediatorService.getUsersByTeamId({ teamId });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserAsFriend", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getFriendsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getFriendsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { conversationId },
      } = this.validationService.validate(GetUsersByConversationIdRequestDto, request, true);

      const { isConversationMember } = await this.conversationUserMediatorService.isConversationMember({ conversationId, userId: jwtId });

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.conversationUserMediatorService.getUsersByConversationId({ conversationId });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getFriendsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface FriendControllerInterface {
  addUserAsFriend(request: Request): Promise<Response>;
  removeUserAsFriend(request: Request): Promise<Response>;
  getFriendsByUserId(request: Request): Promise<Response>;
}
