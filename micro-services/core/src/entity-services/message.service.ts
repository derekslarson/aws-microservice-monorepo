import { inject, injectable } from "inversify";
import { LoggerServiceInterface, MessageFileRepositoryInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MessageRepositoryInterface, Message as MessageEntity, RawMessage } from "../repositories/message.dynamo.repository";
import { UserId } from "../types/userId.type";
import { ConversationId } from "../types/conversationId.type";
import { MessageId } from "../types/messageId.type";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { UpdateMessageReactionAction } from "../enums/updateMessageReactionAction.enum";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnhancedMessageFileRepositoryInterface) private enhancedMessageFileRepository: MessageFileRepositoryInterface,
    @inject(TYPES.MessageRepositoryInterface) private messageRepository: MessageRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private messageSearchRepository: MessageSearchRepositoryInterface,
  ) {}

  public async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { messageId, conversationId, from, mimeType, seenAt, transcript, replyTo } = params;

      const messageEntity: MessageEntity = {
        id: messageId,
        conversationId,
        from,
        seenAt,
        replyTo,
        mimeType,
        transcript,
        createdAt: new Date().toISOString(),
        replyCount: 0,
        reactions: {},
      };

      await this.messageRepository.createMessage({ message: messageEntity });

      const { signedUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: "get",
      });

      const message = {
        ...messageEntity,
        fetchUrl: signedUrl,
      };

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

      const { message: messageEntity } = await this.messageRepository.getMessage({ messageId });

      const { signedUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: "get",
      });

      const message = {
        ...messageEntity,
        fetchUrl: signedUrl,
      };

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

      const { messages: messageEntities } = await this.messageRepository.getMessages({ messageIds });

      const messageMap: Record<string, Message> = {};
      messageEntities.forEach((messageEntity) => {
        const { signedUrl: fetchUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
          messageId: messageEntity.id,
          conversationId: messageEntity.conversationId,
          mimeType: messageEntity.mimeType,
          operation: "get",
        });

        messageMap[messageEntity.id] = { ...messageEntity, fetchUrl };
      });

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

      const { message: messageEntity } = await this.messageRepository.updateMessageSeenAt({ messageId, userId, seenAtValue });

      const { signedUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: "get",
      });

      const message = {
        ...messageEntity,
        fetchUrl: signedUrl,
      };

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

      const { message: messageEntity } = await this.messageRepository.updateMessageReaction({ messageId, userId, reaction, action });

      const { signedUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: "get",
      });

      const message = {
        ...messageEntity,
        fetchUrl: signedUrl,
      };

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

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageRepository.getMessagesByConversationId({ conversationId, exclusiveStartKey, limit });

      const messages = messageEntities.map((messageEntity) => {
        const { signedUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
          messageId: messageEntity.id,
          conversationId: messageEntity.conversationId,
          mimeType: messageEntity.mimeType,
          operation: "get",
        });

        return {
          ...messageEntity,
          fetchUrl: signedUrl,
        };
      });

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

      const { replies: messageEntities, lastEvaluatedKey } = await this.messageRepository.getRepliesByMessageId({ messageId, exclusiveStartKey, limit });

      const replies = messageEntities.map((messageEntity) => {
        const { signedUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
          messageId: messageEntity.id,
          conversationId: messageEntity.conversationId,
          mimeType: messageEntity.mimeType,
          operation: "get",
        });

        return {
          ...messageEntity,
          fetchUrl: signedUrl,
        };
      });

      return { replies, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getRepliesByMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexMessageForSearch(params: IndexMessageForSearchInput): Promise<IndexMessageForSearchOutput> {
    try {
      this.loggerService.trace("indexMessageForSearch called", { params }, this.constructor.name);

      const { message } = params;

      await this.messageSearchRepository.indexDocument({ index: SearchIndex.Message, document: message });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexMessageForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexMessageForSearch(params: DeindexMessageForSearchInput): Promise<DeindexMessageForSearchOutput> {
    try {
      this.loggerService.trace("deindexMessageForSearch called", { params }, this.constructor.name);

      const { messageId } = params;

      await this.messageSearchRepository.deindexDocument({ index: SearchIndex.Message, id: messageId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexMessageForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesBySearchTerm(params: GetMessagesBySearchTermInput): Promise<GetMessagesBySearchTermOutput> {
    try {
      this.loggerService.trace("getMessagesBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, conversationIds, limit, exclusiveStartKey } = params;

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageSearchRepository.getMessagesBySearchTerm({ searchTerm, conversationIds, limit, exclusiveStartKey });

      const messages = messageEntities.map((messageEntity) => {
        const { signedUrl } = this.enhancedMessageFileRepository.getMessageSignedUrl({
          messageId: messageEntity.id,
          conversationId: messageEntity.conversationId,
          mimeType: messageEntity.mimeType,
          operation: "get",
        });

        return {
          ...messageEntity,
          fetchUrl: signedUrl,
        };
      });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesBySearchTerm", { error, params }, this.constructor.name);

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
  indexMessageForSearch(params: IndexMessageForSearchInput): Promise<IndexMessageForSearchOutput>;
  deindexMessageForSearch(params: DeindexMessageForSearchInput): Promise<DeindexMessageForSearchOutput>;
  getMessagesBySearchTerm(params: GetMessagesBySearchTermInput): Promise<GetMessagesBySearchTermOutput>;
}

export interface Message extends MessageEntity {
  fetchUrl: string;
}

export interface CreateMessageInput {
  messageId: MessageId;
  conversationId: ConversationId;
  from: UserId;
  seenAt: Record<UserId, string | null>;
  mimeType: MessageMimeType;
  transcript: string;
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

export interface IndexMessageForSearchInput {
  message: RawMessage;
}

export type IndexMessageForSearchOutput = void;

export interface DeindexMessageForSearchInput {
  messageId: MessageId;
}

export type DeindexMessageForSearchOutput = void;

export interface GetMessagesBySearchTermInput {
  searchTerm: string;
  conversationIds?: ConversationId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesBySearchTermOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

type MessageSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getMessagesBySearchTerm">;
