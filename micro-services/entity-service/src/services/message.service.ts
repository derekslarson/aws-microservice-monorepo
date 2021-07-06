import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { MessageRepositoryInterface, Message as MessageEntity } from "../repositories/message.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";
import { ConversationId } from "../types/conversationId.type";
import { MessageId } from "../types/messageId.type";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.MessageRepositoryInterface) private messageRepository: MessageRepositoryInterface,
  ) {}

  public async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { conversationId, from, transcript, seenAt } = params;

      const messageId: MessageId = `${KeyPrefix.Message}${this.idService.generateId()}`;

      const message: MessageEntity = {
        id: messageId,
        conversationId,
        from,
        transcript,
        seenAt,
        sentAt: new Date().toISOString(),
        reactions: {},
        hasReplies: false,
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

  public async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey } = params;

      const { messages, lastEvaluatedKey } = await this.messageRepository.getMessagesByConversationId({ conversationId, exclusiveStartKey });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput> {
    try {
      this.loggerService.trace("getRepliesByMessageId called", { params }, this.constructor.name);

      const { messageId, exclusiveStartKey } = params;

      const { replies, lastEvaluatedKey } = await this.messageRepository.getRepliesByMessageId({ messageId, exclusiveStartKey });

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
  updateMessageSeenAt(params: UpdateMessageSeenAtInput): Promise<UpdateMessageSeenAtOutput>;
  getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput>;
  getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput>;
}

export type Message = MessageEntity;

export interface CreateMessageInput {
  conversationId: ConversationId;
  from: UserId;
  transcript: string;
  seenAt: { [key: string]: string | null; }
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

export interface UpdateMessageSeenAtInput {
  messageId: MessageId;
  userId: UserId;
  seenAtValue: string | null;
}

export interface UpdateMessageSeenAtOutput {
  message: Message;
}

export interface GetMessagesByConversationIdInput {
  conversationId: ConversationId;
  exclusiveStartKey?: string;
}

export interface GetMessagesByConversationIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetRepliesByMessageIdInput {
  messageId: MessageId;
  exclusiveStartKey?: string;
}

export interface GetRepliesByMessageIdOutput {
  replies: Message[];
  lastEvaluatedKey?: string;
}
