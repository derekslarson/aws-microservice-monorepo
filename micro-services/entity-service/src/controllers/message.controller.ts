import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { TYPES } from "../inversion-of-control/types";
import { MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { CreateFriendMessageDto } from "../dtos/createFriendMessage.dto";
import { CreateGroupMessageDto } from "../dtos/createGroupMessage.dto";
import { CreateMeetingMessageDto } from "../dtos/createMeetingMessage.dto";
import { GetMessagesByUserAndFriendIdsDto } from "../dtos/getMessagesByUserAndFriendIds.dto";
import { GetMessagesByByGroupIdDto } from "../dtos/getMessagesByGroupid.dto";
import { GetMessagesByByMeetingIdDto } from "../dtos/getMessagesByMeetingId.dto";
@injectable()
export class MessageController extends BaseController implements MessageControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
  ) {
    super();
  }

  public async createFriendMessage(request: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      this.loggerService.trace("createFriendMessage called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, friendId },
        body: { transcript },
      } = this.validationService.validate({ dto: CreateFriendMessageDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { message } = await this.messageMediatorService.createFriendMessage({ to: friendId, from: userId, transcript });

      return this.generateCreatedResponse({ message });
    } catch (error: unknown) {
      this.loggerService.error("Error in createFriendMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async createGroupMessage(request: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      this.loggerService.trace("createGroupMessage called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        body: { transcript },
      } = this.validationService.validate({ dto: CreateGroupMessageDto, request, getUserIdFromJwt: true });

      // add group membership validation

      const { message } = await this.messageMediatorService.createGroupMessage({ groupId, from: jwtId, transcript });

      return this.generateCreatedResponse({ message });
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async createMeetingMessage(request: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      this.loggerService.trace("createMeetingMessage called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        body: { transcript },
      } = this.validationService.validate({ dto: CreateMeetingMessageDto, request, getUserIdFromJwt: true });

      // add group membership validation

      const { message } = await this.messageMediatorService.createMeetingMessage({ meetingId, from: jwtId, transcript });

      return this.generateCreatedResponse({ message });
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByUserAndFriendIds(request: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      this.loggerService.trace("getMessagesByUserAndFriendIds called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, friendId },
      } = this.validationService.validate({ dto: GetMessagesByUserAndFriendIdsDto, request, getUserIdFromJwt: true });
      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages } = await this.messageMediatorService.getMessagesByUserAndFriendIds({ userId, friendId, transcript });

      return this.generateSuccessResponse({ messages });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByUserAndFriendIds", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByGroupId(request: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      this.loggerService.trace("getMessagesByGroupId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
      } = this.validationService.validate({ dto: GetMessagesByByGroupIdDto, request, getUserIdFromJwt: true });

      // add group membership validation

      const { messages } = await this.messageMediatorService.getMessagesByGroupId({ groupId });

      return this.generateSuccessResponse({ messages });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByGroupId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByMeetingId(request: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      this.loggerService.trace("getMessagesByMeetingId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
      } = this.validationService.validate({ dto: GetMessagesByByMeetingIdDto, request, getUserIdFromJwt: true });

      // add group membership validation

      const { messages } = await this.messageMediatorService.getMessagesByMeetingId({ meetingId });

      return this.generateSuccessResponse({ messages });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByMeetingId", { error, request }, this.constructor.name);

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
  createFriendMessage(request: Request): Promise<Response>;
  createGroupMessage(request: Request): Promise<Response>;
  createMeetingMessage(request: Request): Promise<Response>;
  getMessagesByUserAndFriendIds(request: Request): Promise<Response>;
  getMessagesByGroupId(request: Request): Promise<Response>;
  getMessagesByMeetingId(request: Request): Promise<Response>;
  getMessage(request: Request): Promise<Response>;
  updateMessageByUserId(request: Request): Promise<Response>;
  getMessagesByConversationId(request: Request): Promise<Response>;
}
