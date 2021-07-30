import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { MessageRepositoryInterface, Message as MessageEntity } from "../repositories/message.dynamo.repository";
import { UserId } from "../types/userId.type";
import { ConversationId } from "../types/conversationId.type";
import { MessageId } from "../types/messageId.type";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { UpdateMessageReactionAction } from "../enums/updateMessageReactionAction.enum";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageRepositoryInterface) private messageRepository: MessageRepositoryInterface,
  ) {}

  public async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { messageId, conversationId, from, mimeType, seenAt, replyTo } = params;

      const message: MessageEntity = {
        id: messageId,
        conversationId,
        from,
        seenAt,
        replyTo,
        mimeType,
        createdAt: new Date().toISOString(),
        replyCount: 0,
        reactions: {},
      };

      await this.messageRepository.createMessage({ message });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessage(params: GetMessageInput): Promise<GetMessageOutput> {
    try {
      this.loggerService.trace("getMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      const { message } = await this.messageRepository.getMessage({ messageId });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessages(params: GetMessagesInput): Promise<GetMessagesOutput> {
    try {
      this.loggerService.trace("getMessages called", { params }, this.constructor.name);

      const { messageIds } = params;

      const { messages } = await this.messageRepository.getMessages({ messageIds });

      const messageMap = messages.reduce((acc: { [key: string]: Message; }, message) => {
        acc[message.id] = message;

        return acc;
      }, {});

      const sortedMessages = messageIds.map((messageId) => messageMap[messageId]);

      return { messages: sortedMessages };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessageSeenAt(params: UpdateMessageSeenAtInput): Promise<UpdateMessageSeenAtOutput> {
    try {
      this.loggerService.trace("updateMessageSeenAt called", { params }, this.constructor.name);

      const { messageId, userId, seenAtValue } = params;

      const { message } = await this.messageRepository.updateMessageSeenAt({ messageId, userId, seenAtValue });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageSeenAt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessageReaction(params: UpdateMessageReactionInput): Promise<UpdateMessageReactionOutput> {
    try {
      this.loggerService.trace("updateMessageReaction called", { params }, this.constructor.name);

      const { messageId, userId, reaction, action } = params;

      const { message } = await this.messageRepository.updateMessageReaction({ messageId, userId, reaction, action });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey, limit } = params;

      const { messages, lastEvaluatedKey } = await this.messageRepository.getMessagesByConversationId({ conversationId, exclusiveStartKey, limit });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput> {
    try {
      this.loggerService.trace("getRepliesByMessageId called", { params }, this.constructor.name);

      const { messageId, exclusiveStartKey, limit } = params;

      const { replies, lastEvaluatedKey } = await this.messageRepository.getRepliesByMessageId({ messageId, exclusiveStartKey, limit });

      return { replies, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getRepliesByMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageServiceInterface {
  createMessage(params: CreateMessageInput): Promise<CreateMessageOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessages(params: GetMessagesInput): Promise<GetMessagesOutput>;
  updateMessageSeenAt(params: UpdateMessageSeenAtInput): Promise<UpdateMessageSeenAtOutput>;
  updateMessageReaction(params: UpdateMessageReactionInput): Promise<UpdateMessageReactionOutput>;
  getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput>;
  getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput>;
}

export type Message = MessageEntity;

export interface CreateMessageInput {
  messageId: MessageId;
  conversationId: ConversationId;
  from: UserId;
  seenAt: Record<UserId, string | null>;
  mimeType: MessageMimeType;
  replyTo?: MessageId;
}

export interface CreateMessageOutput {
  message: Message;
}

export interface GetMessageInput {
  messageId: MessageId;
}

export interface GetMessageOutput {
  message: Message;
}

export interface GetMessagesInput {
  messageIds: MessageId[];
}

export interface GetMessagesOutput {
  messages: Message[];
}

export interface UpdateMessageSeenAtInput {
  messageId: MessageId;
  userId: UserId;
  seenAtValue: string | null;
}

export interface UpdateMessageSeenAtOutput {
  message: Message;
}

export interface UpdateMessageReactionInput {
  messageId: MessageId;
  userId: UserId;
  reaction: string;
  action: UpdateMessageReactionAction;
}

export interface UpdateMessageReactionOutput {
  message: Message;
}

export interface GetMessagesByConversationIdInput {
  conversationId: ConversationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByConversationIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetRepliesByMessageIdInput {
  messageId: MessageId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetRepliesByMessageIdOutput {
  replies: Message[];
  lastEvaluatedKey?: string;
}
