import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { MessageServiceInterface, Message as MessageEntity } from "../entity-services/message.service";
import { ConversationId } from "../types/conversationId.type";
import { UserId } from "../types/userId.type";
import { MessageId } from "../types/messageId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { ConversationServiceInterface } from "../entity-services/conversation.service";
import { PendingMessage as PendingMessageEntity, PendingMessageServiceInterface } from "../entity-services/pendingMessage.service";
import { PendingMessageId } from "../types/pendingMessageId.type";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MimeType } from "../enums/mimeType.enum";
import { MessageFileServiceInterface } from "../entity-services/mesage.file.service";

@injectable()
export class MessageMediatorService implements MessageMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.PendingMessageServiceInterface) private pendingMessageService: PendingMessageServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.MessageFileServiceInterface) private messageFileService: MessageFileServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createFriendMessage(params: CreateFriendMessageInput): Promise<CreateFriendMessageOutput> {
    try {
      this.loggerService.trace("createFriendMessage called", { params }, this.constructor.name);

      const { to, from, mimeType } = params;

      const { conversation } = await this.conversationService.getFriendConversationByUserIds({ userIds: [ to, from ] });

      const { pendingMessage } = await this.pendingMessageService.createPendingMessage({ conversationId: conversation.id, from, mimeType });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId: pendingMessage.id });

      const { signedUrl } = this.messageFileService.getSignedUrl({
        messageId,
        conversationId: conversation.id,
        mimeType,
        operation: "upload",
      });

      const pendingMessageWithUploadUrl = {
        ...pendingMessage,
        id: messageId,
        uploadUrl: signedUrl,
      };

      return { pendingMessage: pendingMessageWithUploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in createFriendMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createGroupMessage(params: CreateGroupMessageInput): Promise<CreateGroupMessageOutput> {
    try {
      this.loggerService.trace("createGroupMessage called", { params }, this.constructor.name);

      const { groupId, from, mimeType } = params;

      const { pendingMessage } = await this.pendingMessageService.createPendingMessage({ conversationId: groupId, from, mimeType });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId: pendingMessage.id });

      const { signedUrl } = this.messageFileService.getSignedUrl({
        messageId,
        conversationId: groupId,
        mimeType,
        operation: "upload",
      });

      const pendingMessageWithUploadUrl = {
        ...pendingMessage,
        id: messageId,
        uploadUrl: signedUrl,
      };

      return { pendingMessage: pendingMessageWithUploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createMeetingMessage(params: CreateMeetingMessageInput): Promise<CreateMeetingMessageOutput> {
    try {
      this.loggerService.trace("createMeetingMessage called", { params }, this.constructor.name);

      const { meetingId, from, mimeType } = params;

      const { pendingMessage } = await this.pendingMessageService.createPendingMessage({ conversationId: meetingId, from, mimeType });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId: pendingMessage.id });

      const { signedUrl } = this.messageFileService.getSignedUrl({
        messageId,
        conversationId: meetingId,
        mimeType,
        operation: "upload",
      });

      const pendingMessageWithUploadUrl = {
        ...pendingMessage,
        id: messageId,
        uploadUrl: signedUrl,
      };

      return { pendingMessage: pendingMessageWithUploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async convertPendingToRegularMessage(params: ConvertPendingToRegularMessageInput): Promise<ConvertPendingToRegularMessageOutput> {
    try {
      this.loggerService.trace("convertPendingToRegularMessage called", { params }, this.constructor.name);

      const { pendingMessageId } = params;

      const { pendingMessage } = await this.pendingMessageService.getPendingMessage({ pendingMessageId });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId });

      const { message } = await this.createMessage({
        messageId,
        conversationId: pendingMessage.conversationId,
        from: pendingMessage.from,
        mimeType: pendingMessage.mimeType,
        replyTo: pendingMessage.replyTo,
      });

      await this.pendingMessageService.deletePendingMessage({ pendingMessageId });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertPendingToRegularMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessage(params: GetMessageInput): Promise<GetMessageOutput> {
    try {
      this.loggerService.trace("getMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      const { message } = await this.messageService.getMessage({ messageId });

      const { signedUrl } = this.messageFileService.getSignedUrl({
        messageId,
        conversationId: message.conversationId,
        mimeType: message.mimeType,
        operation: "get",
      });

      const messageWithFetchUrl = {
        ...message,
        fetchUrl: signedUrl,
      };

      return { message: messageWithFetchUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByUserAndFriendIds(params: GetMessagesByUserAndFriendIdsInput): Promise<GetMessagesByUserAndFriendIdsOutput> {
    try {
      this.loggerService.trace("getMessagesByUserAndFriendIds called", { params }, this.constructor.name);

      const { userId, friendId, exclusiveStartKey, limit } = params;

      const { conversation } = await this.conversationService.getFriendConversationByUserIds({ userIds: [ userId, friendId ] });

      const { messages, lastEvaluatedKey } = await this.getMessagesByConversationId({ conversationId: conversation.id, exclusiveStartKey, limit });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByUserAndFriendIds", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByGroupId(params: GetMessagesByGroupIdInput): Promise<GetMessagesByGroupIdOutput> {
    try {
      this.loggerService.trace("getMessagesByGroupId called", { params }, this.constructor.name);

      const { groupId, exclusiveStartKey, limit } = params;

      const { messages, lastEvaluatedKey } = await this.getMessagesByConversationId({ conversationId: groupId, exclusiveStartKey, limit });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByGroupId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByMeetingId(params: GetMessagesByMeetingIdInput): Promise<GetMessagesByMeetingIdOutput> {
    try {
      this.loggerService.trace("getMessagesByMeetingId called", { params }, this.constructor.name);

      const { meetingId, exclusiveStartKey, limit } = params;

      const { messages, lastEvaluatedKey } = await this.getMessagesByConversationId({ conversationId: meetingId, exclusiveStartKey, limit });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByMeetingId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessageByUserId(params: UpdateMessageByUserIdInput): Promise<UpdateMessageByUserIdOutput> {
    try {
      this.loggerService.trace("updateMessageByUserId called", { params }, this.constructor.name);

      const { messageId, userId, updates: { seen, reactions } } = params;

      const updatePromises: Promise<unknown>[] = [];

      if (typeof seen === "boolean") {
        updatePromises.push(this.updateMessageSeenAt({ messageId, userId, seen }));
      }

      if (reactions) {
        updatePromises.push(...reactions.map(({ reaction, action }) => this.messageService.updateMessageReaction({
          userId,
          messageId,
          reaction,
          action,
        })));
      }

      await Promise.all(updatePromises);

      const { message } = await this.getMessage({ messageId });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async updateMessageSeenAt(params: UpdateMessageSeenAtInput): Promise<UpdateMessageSeenAtOutput> {
    try {
      this.loggerService.trace("updateMessageSeenAt called", { params }, this.constructor.name);

      const { userId, messageId, seen } = params;

      const { message } = await this.messageService.updateMessageSeenAt({
        messageId,
        userId,
        seenAtValue: seen ? new Date().toISOString() : null,
      });

      if (seen) {
        await this.conversationUserRelationshipService.addMessageToConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });
      } else {
        await this.conversationUserRelationshipService.removeUnreadMessageFromConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageSeenAt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  // private async markConversationRead(params: MarkConversationReadInput): Promise<MarkConversationReadOutput> {
  //   try {
  //     this.loggerService.trace("markConversationRead called", { params }, this.constructor.name);

  //     const { userId, conversationId } = params;

  //     const { conversationUserRelationship: { unreadMessages = [] } } = await this.conversationUserRelationshipService.getConversationUserRelationship({ conversationId, userId });

  //     await Promise.all(unreadMessages.map((messageId) => this.markMessageRead({ userId, messageId })));
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in markConversationRead", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  private async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { messageId, conversationId, from, replyTo, mimeType } = params;

      const timestamp = new Date().toISOString();

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId });

      const seenAt = conversationUserRelationships.reduce((acc: { [key: string]: string | null; }, relationship) => {
        acc[relationship.userId] = relationship.userId === from ? timestamp : null;

        return acc;
      }, {});

      const { message } = await this.messageService.createMessage({ messageId, conversationId, from, replyTo, mimeType, seenAt });

      await Promise.all(conversationUserRelationships.map((relationship) => this.conversationUserRelationshipService.addMessageToConversationUserRelationship({
        conversationId,
        userId: relationship.userId,
        messageId: message.id,
        sender: relationship.userId === from,
      })));

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey, limit } = params;

      const { messages, lastEvaluatedKey } = await this.messageService.getMessagesByConversationId({ conversationId, exclusiveStartKey, limit });

      const messagesWithFetchUrls = messages.map((message) => {
        const { signedUrl } = this.messageFileService.getSignedUrl({
          messageId: message.id,
          conversationId: message.conversationId,
          mimeType: message.mimeType,
          operation: "get",
        });

        return {
          ...message,
          fetchUrl: signedUrl,
        };
      });

      return { messages: messagesWithFetchUrls, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private convertPendingToRegularMessageId(params: ConvertPendingToRegularMessageIdInput): ConvertPendingToRegularMessageIdOutput {
    try {
      this.loggerService.trace("convertPendingToRegularMessageId called", { params }, this.constructor.name);

      const { pendingMessageId } = params;

      const messageId = pendingMessageId.replace(KeyPrefix.PendingMessage, KeyPrefix.Message) as MessageId;

      return { messageId };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertPendingToRegularMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageMediatorServiceInterface {
  createFriendMessage(params: CreateFriendMessageInput): Promise<CreateFriendMessageOutput>;
  createGroupMessage(params: CreateGroupMessageInput): Promise<CreateGroupMessageOutput>;
  createMeetingMessage(params: CreateMeetingMessageInput): Promise<CreateMeetingMessageOutput>;
  convertPendingToRegularMessage(params: ConvertPendingToRegularMessageInput): Promise<ConvertPendingToRegularMessageOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessagesByUserAndFriendIds(params: GetMessagesByUserAndFriendIdsInput): Promise<GetMessagesByUserAndFriendIdsOutput>;
  getMessagesByGroupId(params: GetMessagesByGroupIdInput): Promise<GetMessagesByGroupIdOutput>;
  getMessagesByMeetingId(params: GetMessagesByMeetingIdInput): Promise<GetMessagesByMeetingIdOutput>;
  updateMessageByUserId(params: UpdateMessageByUserIdInput): Promise<UpdateMessageByUserIdOutput>;
}
export interface PendingMessage extends Omit<PendingMessageEntity, "id"> {
  id: MessageId
  uploadUrl: string;
}

export interface Message extends MessageEntity {
  fetchUrl: string;
}

export interface CreateFriendMessageInput {
  to: UserId;
  from: UserId;
  mimeType: MimeType;
}

export interface CreateFriendMessageOutput {
  pendingMessage: PendingMessage;
}

export interface CreateGroupMessageInput {
  groupId: GroupId;
  from: UserId;
  mimeType: MimeType;
}

export interface CreateGroupMessageOutput {
  pendingMessage: PendingMessage;
}

export interface CreateMeetingMessageInput {
  meetingId: MeetingId;
  from: UserId;
  mimeType: MimeType;
}

export interface CreateMeetingMessageOutput {
  pendingMessage: PendingMessage;
}

export interface GetMessageInput {
  messageId: MessageId;
}

export interface GetMessageOutput {
  message: Message;
}

export interface GetMessagesByUserAndFriendIdsInput {
  userId: UserId;
  friendId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByUserAndFriendIdsOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesByGroupIdInput {
  groupId: GroupId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByGroupIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesByMeetingIdInput {
  meetingId: MeetingId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByMeetingIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

interface ReactionChange {
  reaction: string;
  action: "add" | "remove"
}
export interface UpdateMessageByUserIdInput {
  userId: UserId;
  messageId: MessageId;
  updates: {
    seen?: boolean;
    reactions?: ReactionChange[];
  }
}

export interface UpdateMessageByUserIdOutput {
  message: Message;
}

export interface ConvertPendingToRegularMessageInput {
  pendingMessageId: PendingMessageId;
}

export interface ConvertPendingToRegularMessageOutput {
  message: MessageEntity;
}

interface CreateMessageInput {
  messageId: MessageId;
  conversationId: ConversationId;
  from: UserId;
  mimeType: MimeType;
  replyTo?: MessageId;
}

interface CreateMessageOutput {
  message: MessageEntity;
}

interface GetMessagesByConversationIdInput {
  conversationId: ConversationId;
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetMessagesByConversationIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

interface UpdateMessageSeenAtInput {
  userId: UserId;
  messageId: MessageId;
  seen: boolean;
}

type UpdateMessageSeenAtOutput = void;

interface UpdateMessageReactionInput {
  userId: UserId;
  messageId: MessageId;
  reaction: string;
  action: "add" | "remove"
}

type UpdateMessageReactionOutput = void;

// interface MarkConversationReadInput {
//   userId: UserId;
//   conversationId: ConversationId;
// }

// type MarkConversationReadOutput = void;

interface ConvertPendingToRegularMessageIdInput {
  pendingMessageId: PendingMessageId;
}

interface ConvertPendingToRegularMessageIdOutput {
  messageId: MessageId;
}
