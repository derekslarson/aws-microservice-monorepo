import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Message, BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MessageMediatorServiceInterface, PendingMessage } from "../mediator-services/message.mediator.service";
import { CreateFriendMessageDto } from "../dtos/createFriendMessage.dto";
import { CreateGroupMessageDto } from "../dtos/createGroupMessage.dto";
import { CreateMeetingMessageDto } from "../dtos/createMeetingMessage.dto";
import { GetMessagesByUserAndFriendIdsDto } from "../dtos/getMessagesByUserAndFriendIds.dto";
import { GetMessagesByByGroupIdDto } from "../dtos/getMessagesByGroupId.dto";
import { GetMessagesByByMeetingIdDto } from "../dtos/getMessagesByMeetingId.dto";
import { GetMessagesByUserIdAndSearchTermDto } from "../dtos/getMessagesByUserIdAndSearchTerm.dto";
import { GetMessageDto } from "../dtos/getMessage.dto";
import { UpdateMessageByUserIdDto } from "../dtos/updateMessageByUserId.dto";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { ConversationMediatorServiceInterface } from "../mediator-services/conversation.mediator.service";
import { UpdateMeetingMessagesByUserIdDto } from "../dtos/updateMeetingMessagesByUserId.dto";
import { UpdateGroupMessagesByUserIdDto } from "../dtos/updateGroupMessagesByUserId.dto";
import { UpdateFriendMessagesByUserIdDto } from "../dtos/updateFriendMessagesByUserId.dto";
import { ConversationType } from "../enums/conversationType.enum";
import { MeetingId } from "../types/meetingId.type";
import { GroupId } from "../types/groupId.type";

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
        body: { mimeType },
      } = this.validationService.validate({ dto: CreateFriendMessageDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { pendingMessage } = await this.messageMediatorService.createFriendMessage({ to: friendId, from: userId, mimeType });

      const response: CreateFriendMessageResponse = { pendingMessage };

      return this.generateCreatedResponse(response);
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
        body: { mimeType },
      } = this.validationService.validate({ dto: CreateGroupMessageDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { pendingMessage } = await this.messageMediatorService.createGroupMessage({ groupId, from: jwtId, mimeType });

      const response: CreateGroupMessageResponse = { pendingMessage };

      return this.generateCreatedResponse(response);
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
        body: { mimeType },
      } = this.validationService.validate({ dto: CreateMeetingMessageDto, request, getUserIdFromJwt: true });

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { pendingMessage } = await this.messageMediatorService.createMeetingMessage({ meetingId, from: jwtId, mimeType });

      const response: CreateMeetingMessageResponse = { pendingMessage };

      return this.generateCreatedResponse(response);
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
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByUserAndFriendIdsDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByUserAndFriendIds({ userId, friendId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetMessagesByUserAndFriendIdsResponse = { messages, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
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
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByByGroupIdDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByGroupId({ groupId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetMessagesByGroupIdResponse = { messages, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
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
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByByMeetingIdDto, request, getUserIdFromJwt: true });

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByMeetingId({ meetingId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetMessagesByMeetingIdResponse = { messages, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByMeetingId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByUserIdAndSearchTerm(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByUserIdAndSearchTerm called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByUserIdAndSearchTermDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByUserIdAndSearchTerm({ userId, searchTerm, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetMessagesByUserIdAndSearchTermResponse = { messages, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByUserIdAndSearchTerm", { error, request }, this.constructor.name);

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

      let isConversationMember: boolean;

      if (message.type === ConversationType.Friend) {
        isConversationMember = message.to.id === jwtId || message.from.id === jwtId;
      } else {
        ({ isConversationMember } = await this.conversationMediatorService.isConversationMember({ conversationId: message.to.id as GroupId | MeetingId, userId: jwtId }));
      }

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const response: GetMessageResponse = { message };

      return this.generateSuccessResponse(response);
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

      let isConversationMember: boolean;

      if (message.type === ConversationType.Friend) {
        isConversationMember = message.to.id === jwtId || message.from.id === jwtId;
      } else {
        ({ isConversationMember } = await this.conversationMediatorService.isConversationMember({ conversationId: message.to.id as GroupId | MeetingId, userId: jwtId }));
      }

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { message: updatedMessage } = await this.messageMediatorService.updateMessageByUserId({ userId, messageId, updates: body });

      const response: UpdateMessageByUserIdResponse = { message: updatedMessage };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateFriendMessagesByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateFriendMessagesByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, friendId },
        body,
      } = this.validationService.validate({ dto: UpdateFriendMessagesByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      await this.messageMediatorService.updateFriendMessagesByUserId({ userId, friendId, updates: body });

      const response: UpdateFriendMessagesByUserIdResponse = { message: "Friend messages updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateFriendMessagesByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateGroupMessagesByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateGroupMessagesByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, groupId },
        body,
      } = this.validationService.validate({ dto: UpdateGroupMessagesByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      await this.messageMediatorService.updateGroupMessagesByUserId({ userId, groupId, updates: body });

      const response: UpdateGroupMessagesByUserIdResponse = { message: "Group messages updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroupMessagesByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateMeetingMessagesByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateMeetingMessagesByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, meetingId },
        body,
      } = this.validationService.validate({ dto: UpdateMeetingMessagesByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      await this.messageMediatorService.updateMeetingMessagesByUserId({ userId, meetingId, updates: body });

      const response: UpdateMeetingMessagesByUserIdResponse = { message: "Meeting messages updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeetingMessagesByUserId", { error, request }, this.constructor.name);

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
  getMessagesByUserIdAndSearchTerm(request: Request): Promise<Response>;
  getMessage(request: Request): Promise<Response>;
  updateMessageByUserId(request: Request): Promise<Response>;
  updateFriendMessagesByUserId(request: Request): Promise<Response>;
  updateGroupMessagesByUserId(request: Request): Promise<Response>;
  updateMeetingMessagesByUserId(request: Request): Promise<Response>;
}

export interface CreateFriendMessageResponse {
  pendingMessage: PendingMessage;
}

export interface CreateGroupMessageResponse {
  pendingMessage: PendingMessage;
}

export interface CreateMeetingMessageResponse {
  pendingMessage: PendingMessage;
}

export interface GetMessagesByUserAndFriendIdsResponse {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesByGroupIdResponse {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesByMeetingIdResponse {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesByUserIdAndSearchTermResponse {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessageResponse {
  message: Message;
}

export interface UpdateMessageByUserIdResponse {
  message: Message;
}

export interface UpdateFriendMessagesByUserIdResponse {
  message: "Friend messages updated.";
}

export interface UpdateGroupMessagesByUserIdResponse {
  message: "Group messages updated.";
}

export interface UpdateMeetingMessagesByUserIdResponse {
  message: "Meeting messages updated.";
}
