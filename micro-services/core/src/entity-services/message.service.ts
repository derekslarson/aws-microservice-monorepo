import { inject, injectable } from "inversify";
import { FileOperation, LoggerServiceInterface, MessageFileRepositoryInterface, MessageId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MessageRepositoryInterface, Message as MessageEntity, RawMessage, ConversationId, MessageUpdates } from "../repositories/message.dynamo.repository";
import { MessageMimeType } from "../enums/message.mimeType.enum";
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

      const { messageId, conversationId, from, mimeType, seenAt, transcript, replyTo, title } = params;

      const now = new Date().toISOString();

      const messageEntity: MessageEntity = {
        id: messageId,
        conversationId,
        from,
        seenAt,
        replyTo,
        mimeType,
        transcript,
        createdAt: now,
        updatedAt: now,
        replyCount: 0,
        reactions: {},
        title,
      };

      await this.messageRepository.createMessage({ message: messageEntity });

      const { signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: FileOperation.Get,
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

      const { signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: FileOperation.Get,
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
        const { signedUrl: fetchUrl } = this.enhancedMessageFileRepository.getSignedUrl({
          messageId: messageEntity.id,
          conversationId: messageEntity.conversationId,
          mimeType: messageEntity.mimeType,
          operation: FileOperation.Get,
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

  public async markMessageSeen(params: MarkMessageSeenInput): Promise<MarkMessageSeenOutput> {
    try {
      this.loggerService.trace("markMessageSeen called", { params }, this.constructor.name);

      const { messageId, userId } = params;

      const { message: messageEntity } = await this.messageRepository.markMessageSeen({ messageId, userId });

      const { signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: FileOperation.Get,
      });

      const message = {
        ...messageEntity,
        fetchUrl: signedUrl,
      };

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in markMessageSeen", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addMessageReaction(params: AddMessageReactionInput): Promise<AddMessageReactionOutput> {
    try {
      this.loggerService.trace("addMessageReaction called", { params }, this.constructor.name);

      const { messageId, userId, reaction } = params;

      const { message: messageEntity } = await this.messageRepository.addMessageReaction({ messageId, userId, reaction });

      const { signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: FileOperation.Get,
      });

      const message = {
        ...messageEntity,
        fetchUrl: signedUrl,
      };

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in addMessageReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeMessageReaction(params: RemoveMessageReactionInput): Promise<RemoveMessageReactionOutput> {
    try {
      this.loggerService.trace("removeMessageReaction called", { params }, this.constructor.name);

      const { messageId, userId, reaction } = params;

      const { message: messageEntity } = await this.messageRepository.removeMessageReaction({ messageId, userId, reaction });

      const { signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
        messageId: messageEntity.id,
        conversationId: messageEntity.conversationId,
        mimeType: messageEntity.mimeType,
        operation: FileOperation.Get,
      });

      const message = {
        ...messageEntity,
        fetchUrl: signedUrl,
      };

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeMessageReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput> {
    try {
      this.loggerService.trace("updateMessage called", { params }, this.constructor.name);

      await this.messageRepository.updateMessage(params);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey, limit } = params;

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageRepository.getMessagesByConversationId({ conversationId, exclusiveStartKey, limit });

      const messages = messageEntities.map((messageEntity) => {
        const { signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
          messageId: messageEntity.id,
          conversationId: messageEntity.conversationId,
          mimeType: messageEntity.mimeType,
          operation: FileOperation.Get,
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

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageRepository.getRepliesByMessageId({ messageId, exclusiveStartKey, limit });

      const replies = messageEntities.map((messageEntity) => {
        const { signedUrl } = this.enhancedMessageFileRepository.getSignedUrl({
          messageId: messageEntity.id,
          conversationId: messageEntity.conversationId,
          mimeType: messageEntity.mimeType,
          operation: FileOperation.Get,
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

      const { message: rawMessage } = params;

      const { message } = this.messageRepository.convertRawMessageToMessage({ rawMessage });

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

      const searchMessageIds = messageEntities.map((message) => message.id);

      const { messages } = await this.getMessages({ messageIds: searchMessageIds });

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
  markMessageSeen(params: MarkMessageSeenInput): Promise<MarkMessageSeenOutput>;
  addMessageReaction(params: AddMessageReactionInput): Promise<AddMessageReactionOutput>;
  removeMessageReaction(params: RemoveMessageReactionInput): Promise<RemoveMessageReactionOutput>;
  updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput>;
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
  title?: string;
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

export interface MarkMessageSeenInput {
  messageId: MessageId;
  userId: UserId;
  seenAtValue: string | null;
}

export interface MarkMessageSeenOutput {
  message: Message;
}

export interface AddMessageReactionInput {
  messageId: MessageId;
  userId: UserId;
  reaction: string;
}

export interface AddMessageReactionOutput {
  message: Message;
}

export interface RemoveMessageReactionInput {
  messageId: MessageId;
  userId: UserId;
  reaction: string;
}

export interface RemoveMessageReactionOutput {
  message: Message;
}

export interface UpdateMessageInput {
  messageId: MessageId;
  updates: MessageUpdates;
}

export type UpdateMessageOutput = void;

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
