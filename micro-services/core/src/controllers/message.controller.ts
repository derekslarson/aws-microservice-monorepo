import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Message, BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface, GroupId, MeetingId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { CreateOneOnOneMessageDto } from "../dtos/createOneOnOneMessage.dto";
import { CreateGroupMessageDto } from "../dtos/createGroupMessage.dto";
import { CreateMeetingMessageDto } from "../dtos/createMeetingMessage.dto";
import { GetMessagesByMeetingIdDto } from "../dtos/getMessagesByMeetingId.dto";
import { GetMessagesByUserIdAndSearchTermDto } from "../dtos/getMessagesByUserIdAndSearchTerm.dto";
import { GetMessageDto } from "../dtos/getMessage.dto";
import { UpdateMessageByUserIdDto } from "../dtos/updateMessageByUserId.dto";
import { ConversationType } from "../enums/conversationType.enum";
import { UpdateMessageDto } from "../dtos/updateMessage.dto";
import { GetMessagesByOneOnOneIdDto } from "../dtos/getMessagesByOneOnOneId.dto";
import { GetMessagesByGroupIdDto } from "../dtos/getMessagesByGroupId.dto";
import { MessageServiceInterface, PendingMessage } from "../services/tier-2/message.service";
import { GroupServiceInterface } from "../services/tier-1/group.service";
import { MeetingServiceInterface } from "../services/tier-1/meeting.service";
import { ConversationServiceInterface } from "../services/tier-3/conversation.service";

@injectable()
export class MessageController extends BaseController implements MessageControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingServiceInterface,
    @inject(TYPES.ConversationOrchestratorServiceInterface) private conversationOrchestratorService: ConversationServiceInterface,
  ) {
    super();
  }

  public async createOneOnOneMessage(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createOneOnOneMessage called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { oneOnOneId },
        body: { mimeType },
      } = this.validationService.validate({ dto: CreateOneOnOneMessageDto, request, getUserIdFromJwt: true });

      if (!oneOnOneId.includes(jwtId)) {
        throw new ForbiddenError("Forbidden");
      }

      const { pendingMessage } = await this.messageService.createPendingMessage({ conversationId: oneOnOneId, from: jwtId, mimeType });

      const response: CreateOneOnOneMessageResponse = { pendingMessage };

      return this.generateCreatedResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOneMessage", { error, request }, this.constructor.name);

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

      const { pendingMessage } = await this.messageService.createPendingMessage({ conversationId: groupId, from: jwtId, mimeType });

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

      const { pendingMessage } = await this.messageService.createPendingMessage({ conversationId: meetingId, from: jwtId, mimeType });

      const response: CreateMeetingMessageResponse = { pendingMessage };

      return this.generateCreatedResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByOneOnOneId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByUserAndOneOnOneIds called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { oneOnOneId },
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByOneOnOneIdDto, request, getUserIdFromJwt: true });

      if (!oneOnOneId.includes(jwtId)) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageService.getMessagesByConversationId({
        requestingUserId: jwtId,
        conversationId: oneOnOneId,
        searchTerm,
        exclusiveStartKey,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      const response: GetMessagesByUserAndOneOnOneIdsResponse = { messages, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByUserAndOneOnOneIds", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMessagesByGroupId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByGroupId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByGroupIdDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageService.getMessagesByConversationId({
        requestingUserId: jwtId,
        conversationId: groupId,
        searchTerm,
        exclusiveStartKey,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

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
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByMeetingIdDto, request, getUserIdFromJwt: true });

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageService.getMessagesByConversationId({
        requestingUserId: jwtId,
        conversationId: meetingId,
        searchTerm,
        exclusiveStartKey,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

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

      const { messages, lastEvaluatedKey } = await this.messageService.getMessagesBySearchTerm({
        userId,
        searchTerm,
        exclusiveStartKey,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

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

      const { message } = await this.messageService.getMessage({ messageId });

      let isConversationMember: boolean;

      if (message.type === ConversationType.OneOnOne) {
        isConversationMember = message.to.id === jwtId || message.from.id === jwtId;
      } else {
        ({ isConversationMember } = await this.conversationOrchestratorService.isConversationMember({ conversationId: message.to.id as GroupId | MeetingId, userId: jwtId }));
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

      const { message } = await this.messageService.getMessage({ messageId });

      let isConversationMember: boolean;

      if (message.type === ConversationType.OneOnOne) {
        isConversationMember = message.to.id === jwtId || message.from.id === jwtId;
      } else {
        ({ isConversationMember } = await this.conversationOrchestratorService.isConversationMember({ conversationId: message.to.id as GroupId | MeetingId, userId: jwtId }));
      }

      if (!isConversationMember) {
        throw new ForbiddenError("Forbidden");
      }

      await this.messageService.updateMessageByUserId({ userId, messageId, updates: body });

      const response: UpdateMessageByUserIdResponse = { message: "Message updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  // public async updateOneOnOneMessagesByUserId(request: Request): Promise<Response> {
  //   try {
  //     this.loggerService.trace("updateOneOnOneMessagesByUserId called", { request }, this.constructor.name);

  //     const {
  //       jwtId,
  //       pathParameters: { userId, friendId },
  //       body,
  //     } = this.validationService.validate({ dto: UpdateOneOnOneMessagesByUserIdDto, request, getUserIdFromJwt: true });

  //     if (jwtId !== userId) {
  //       throw new ForbiddenError("Forbidden");
  //     }

  //     await this.messageService.updateOneOnOneMessagesByUserId({ userId, friendId, updates: body });

  //     const response: UpdateOneOnOneMessagesByUserIdResponse = { message: "OneOnOne messages updated." };

  //     return this.generateSuccessResponse(response);
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in updateOneOnOneMessagesByUserId", { error, request }, this.constructor.name);

  //     return this.generateErrorResponse(error);
  //   }
  // }

  // public async updateGroupMessagesByUserId(request: Request): Promise<Response> {
  //   try {
  //     this.loggerService.trace("updateGroupMessagesByUserId called", { request }, this.constructor.name);

  //     const {
  //       jwtId,
  //       pathParameters: { userId, groupId },
  //       body,
  //     } = this.validationService.validate({ dto: UpdateGroupMessagesByUserIdDto, request, getUserIdFromJwt: true });

  //     if (jwtId !== userId) {
  //       throw new ForbiddenError("Forbidden");
  //     }

  //     const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

  //     if (!isGroupMember) {
  //       throw new ForbiddenError("Forbidden");
  //     }

  //     await this.messageService.updateGroupMessagesByUserId({ userId, groupId, updates: body });

  //     const response: UpdateGroupMessagesByUserIdResponse = { message: "Group messages updated." };

  //     return this.generateSuccessResponse(response);
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in updateGroupMessagesByUserId", { error, request }, this.constructor.name);

  //     return this.generateErrorResponse(error);
  //   }
  // }

  // public async updateMeetingMessagesByUserId(request: Request): Promise<Response> {
  //   try {
  //     this.loggerService.trace("updateMeetingMessagesByUserId called", { request }, this.constructor.name);

  //     const {
  //       jwtId,
  //       pathParameters: { userId, meetingId },
  //       body,
  //     } = this.validationService.validate({ dto: UpdateMeetingMessagesByUserIdDto, request, getUserIdFromJwt: true });

  //     if (jwtId !== userId) {
  //       throw new ForbiddenError("Forbidden");
  //     }

  //     const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

  //     if (!isMeetingMember) {
  //       throw new ForbiddenError("Forbidden");
  //     }

  //     await this.messageService.updateMeetingMessagesByUserId({ userId, meetingId, updates: body });

  //     const response: UpdateMeetingMessagesByUserIdResponse = { message: "Meeting messages updated." };

  //     return this.generateSuccessResponse(response);
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in updateMeetingMessagesByUserId", { error, request }, this.constructor.name);

  //     return this.generateErrorResponse(error);
  //   }
  // }

  public async updateMessage(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateMessage called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { messageId },
        body,
      } = this.validationService.validate({ dto: UpdateMessageDto, request, getUserIdFromJwt: true });

      const { message } = await this.messageService.getMessage({ messageId });

      if (jwtId !== message.from.id) {
        throw new ForbiddenError("Forbidden");
      }

      await this.messageService.updateMessage({ messageId, updates: body });

      const response: UpdateMessageResponse = { message: "Message updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessage", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface MessageControllerInterface {
  createOneOnOneMessage(request: Request): Promise<Response>;
  createGroupMessage(request: Request): Promise<Response>;
  createMeetingMessage(request: Request): Promise<Response>;
  getMessagesByOneOnOneId(request: Request): Promise<Response>;
  getMessagesByGroupId(request: Request): Promise<Response>;
  getMessagesByMeetingId(request: Request): Promise<Response>;
  getMessagesByUserIdAndSearchTerm(request: Request): Promise<Response>;
  getMessage(request: Request): Promise<Response>;
  updateMessageByUserId(request: Request): Promise<Response>;
  // updateOneOnOneMessagesByUserId(request: Request): Promise<Response>;
  // updateGroupMessagesByUserId(request: Request): Promise<Response>;
  // updateMeetingMessagesByUserId(request: Request): Promise<Response>;
  updateMessage(request: Request): Promise<Response>;
}

export interface CreateOneOnOneMessageResponse {
  pendingMessage: PendingMessage;
}

export interface CreateGroupMessageResponse {
  pendingMessage: PendingMessage;
}

export interface CreateMeetingMessageResponse {
  pendingMessage: PendingMessage;
}

export interface GetMessagesByUserAndOneOnOneIdsResponse {
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
  message: "Message updated.";
}

export interface UpdateOneOnOneMessagesByUserIdResponse {
  message: "OneOnOne messages updated.";
}

export interface UpdateGroupMessagesByUserIdResponse {
  message: "Group messages updated.";
}

export interface UpdateMeetingMessagesByUserIdResponse {
  message: "Meeting messages updated.";
}

export interface UpdateMessageResponse {
  message: "Message updated.";
}
