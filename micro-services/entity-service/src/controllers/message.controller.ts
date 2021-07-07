import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { CreateFriendMessageDto } from "../dtos/createFriendMessage.dto";
import { CreateGroupMessageDto } from "../dtos/createGroupMessage.dto";
import { CreateMeetingMessageDto } from "../dtos/createMeetingMessage.dto";
import { GetMessagesByUserAndFriendIdsDto } from "../dtos/getMessagesByUserAndFriendIds.dto";
import { GetMessagesByByGroupIdDto } from "../dtos/getMessagesByGroupid.dto";
import { GetMessagesByByMeetingIdDto } from "../dtos/getMessagesByMeetingId.dto";
import { GetMessageDto } from "../dtos/getMessage.dto";
import { UpdateMessageByUserIdDto } from "../dtos/updateMessageByUserId.dto";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { ConversationMediatorServiceInterface } from "../mediator-services/conversation.mediator.service";
@injectable()
export class MessageController extends BaseController implements MessageControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.ConversationMediatorServiceInterface) private conversationMediatorService: ConversationMediatorServiceInterface,
  ) {
    super();
  }

  public async createFriendMessage(request: Request): Promise<Response> {
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

  public async createGroupMessage(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createGroupMessage called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        body: { transcript },
      } = this.validationService.validate({ dto: CreateGroupMessageDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { message } = await this.messageMediatorService.createGroupMessage({ groupId, from: jwtId, transcript });

      return this.generateCreatedResponse({ message });
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async createMeetingMessage(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createMeetingMessage called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        body: { transcript },
      } = this.validationService.validate({ dto: CreateMeetingMessageDto, request, getUserIdFromJwt: true });

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { message } = await this.messageMediatorService.createMeetingMessage({ meetingId, from: jwtId, transcript });

      return this.generateCreatedResponse({ message });
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByUserAndFriendIds(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByUserAndFriendIds called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, friendId },
      } = this.validationService.validate({ dto: GetMessagesByUserAndFriendIdsDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages } = await this.messageMediatorService.getMessagesByUserAndFriendIds({ userId, friendId });

      return this.generateSuccessResponse({ messages });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByUserAndFriendIds", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByGroupId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByGroupId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        queryStringParameters: { exclusiveStartKey },
      } = this.validationService.validate({ dto: GetMessagesByByGroupIdDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByGroupId({ groupId, exclusiveStartKey });

      return this.generateSuccessResponse({ messages, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByGroupId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByMeetingId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByMeetingId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        queryStringParameters: { exclusiveStartKey },
      } = this.validationService.validate({ dto: GetMessagesByByMeetingIdDto, request, getUserIdFromJwt: true });

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByMeetingId({ meetingId, exclusiveStartKey });

      return this.generateSuccessResponse({ messages, lastEvaluatedKey });
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
        pathParameters: { messageId },
      } = this.validationService.validate({ dto: GetMessageDto, request, getUserIdFromJwt: true });

      const { message } = await this.messageMediatorService.getMessage({ messageId });

      const { isConversationMember } = await this.conversationMediatorService.isConversationMember({ conversationId: message.conversationId, userId: jwtId });

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      return this.generateSuccessResponse({ message });
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
        pathParameters: { userId, messageId },
        body,
      } = this.validationService.validate({ dto: UpdateMessageByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { message } = await this.messageMediatorService.getMessage({ messageId });

      const { isConversationMember } = await this.conversationMediatorService.isConversationMember({ conversationId: message.conversationId, userId: jwtId });

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { message: updatedMessage } = await this.messageMediatorService.updateMessageByUserId({ userId, messageId, updates: body });

      return this.generateSuccessResponse({ message: updatedMessage });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageByUserId", { error, request }, this.constructor.name);

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
}
