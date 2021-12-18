import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Message, BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface, GroupId, MeetingId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MessageMediatorServiceInterface, PendingMessage } from "../mediator-services/message.mediator.service";
import { CreateOneOnOneMessageDto } from "../dtos/createOneOnOneMessage.dto";
import { CreateGroupMessageDto } from "../dtos/createGroupMessage.dto";
import { CreateMeetingMessageDto } from "../dtos/createMeetingMessage.dto";
import { GetMessagesByByMeetingIdDto } from "../dtos/getMessagesByMeetingId.dto";
import { GetMessagesByUserIdAndSearchTermDto } from "../dtos/getMessagesByUserIdAndSearchTerm.dto";
import { GetMessageDto } from "../dtos/getMessage.dto";
import { UpdateMessageByUserIdDto } from "../dtos/updateMessageByUserId.dto";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { ConversationType } from "../enums/conversationType.enum";
import { UpdateMessageDto } from "../dtos/updateMessage.dto";
import { GetMessagesByOneOnOneIdDto } from "../dtos/getMessagesByOneOnOneId.dto";
import { ConversationOrchestratorServiceInterface } from "../orchestrator-services/conversation.orchestrator.service";
import { GetMessagesByByGroupIdDto } from "../dtos/getMessagesByGroupId.dto";

@injectable()
export class MessageController extends BaseController implements MessageControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.ConversationOrchestratorServiceInterface) private conversationOrchestratorService: ConversationOrchestratorServiceInterface,
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

      const { pendingMessage } = await this.messageMediatorService.createOneOnOneMessage({ oneOnOneId, from: jwtId, mimeType });

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

  public async getMessagesByOneOnOneId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMessagesByUserAndOneOnOneIds called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { oneOnOneId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByOneOnOneIdDto, request, getUserIdFromJwt: true });

      if (!oneOnOneId.includes(jwtId)) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByOneOnOneId({ requestingUserId: jwtId, oneOnOneId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

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
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMessagesByByGroupIdDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByGroupId({ requestingUserId: jwtId, groupId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

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

      const { messages, lastEvaluatedKey } = await this.messageMediatorService.getMessagesByMeetingId({ requestingUserId: jwtId, meetingId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

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

      const { message } = await this.messageMediatorService.getMessage({ messageId });

      let isConversationMember: boolean;

      if (message.type === ConversationType.OneOnOne) {
        isConversationMember = message.to.id === jwtId || message.from.id === jwtId;
      } else {
        ({ isConversationMember } = await this.conversationOrchestratorService.isConversationMember({ conversationId: message.to.id as GroupId | MeetingId, userId: jwtId }));
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

  //     await this.messageMediatorService.updateOneOnOneMessagesByUserId({ userId, friendId, updates: body });

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

  //     await this.messageMediatorService.updateGroupMessagesByUserId({ userId, groupId, updates: body });

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

  //     await this.messageMediatorService.updateMeetingMessagesByUserId({ userId, meetingId, updates: body });

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

      const { message } = await this.messageMediatorService.getMessage({ messageId });

      if (jwtId !== message.from.id) {
        throw new ForbiddenError("Forbidden");
      }

      await this.messageMediatorService.updateMessage({ messageId, updates: body });

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
  message: Message;
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
