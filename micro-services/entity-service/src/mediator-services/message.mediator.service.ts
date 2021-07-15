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
import { ReactionServiceInterface, Reaction as ReactionEntity } from "../entity-services/reaction.service";

@injectable()
export class MessageMediatorService implements MessageMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.ReactionServiceInterface) private reactionService: ReactionServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createFriendMessage(params: CreateFriendMessageInput): Promise<CreateFriendMessageOutput> {
    try {
      this.loggerService.trace("createFriendMessage called", { params }, this.constructor.name);

      const { to, from, transcript } = params;

      const { conversation } = await this.conversationService.getFriendConversationByUserIds({ userIds: [ to, from ] });

      const { message } = await this.createMessage({ conversationId: conversation.id, from, transcript });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createFriendMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createGroupMessage(params: CreateGroupMessageInput): Promise<CreateGroupMessageOutput> {
    try {
      this.loggerService.trace("createGroupMessage called", { params }, this.constructor.name);

      const { groupId, from, transcript } = params;

      const { message } = await this.createMessage({ conversationId: groupId, from, transcript });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createMeetingMessage(params: CreateMeetingMessageInput): Promise<CreateMeetingMessageOutput> {
    try {
      this.loggerService.trace("createMeetingMessage called", { params }, this.constructor.name);

      const { meetingId, from, transcript } = params;

      const { message } = await this.createMessage({ conversationId: meetingId, from, transcript });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessage(params: GetMessageInput): Promise<GetMessageOutput> {
    try {
      this.loggerService.trace("getMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      const { message } = await this.messageService.getMessage({ messageId });

      return { message };
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
        updatePromises.push(...reactions.map(({ reaction, action }) => this.updateMessageReaction({
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

  private async updateMessageReaction(params: UpdateMessageReactionInput): Promise<UpdateMessageReactionOutput> {
    try {
      this.loggerService.trace("updateMessageReaction called", { params }, this.constructor.name);

      const { reaction, action, messageId, userId } = params;

      await Promise.all<unknown>([
        action === "add" ? this.reactionService.createReaction({ messageId, userId, type: reaction }) : this.reactionService.deleteReaction({ messageId, userId, type: reaction }),
        this.messageService.updateMessageReaction({ messageId, reaction, action }),
      ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageReaction", { error, params }, this.constructor.name);

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

      const { conversationId, from, transcript } = params;

      const timestamp = new Date().toISOString();

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId });

      const seenAt = conversationUserRelationships.reduce((acc: { [key: string]: string | null; }, relationship) => {
        acc[relationship.userId] = relationship.userId === from ? timestamp : null;

        return acc;
      }, {});

      const { message } = await this.messageService.createMessage({ conversationId, from, transcript, seenAt });

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

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageMediatorServiceInterface {
  createFriendMessage(params: CreateFriendMessageInput): Promise<CreateFriendMessageOutput>;
  createGroupMessage(params: CreateGroupMessageInput): Promise<CreateGroupMessageOutput>;
  createMeetingMessage(params: CreateMeetingMessageInput): Promise<CreateMeetingMessageOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessagesByUserAndFriendIds(params: GetMessagesByUserAndFriendIdsInput): Promise<GetMessagesByUserAndFriendIdsOutput>;
  getMessagesByGroupId(params: GetMessagesByGroupIdInput): Promise<GetMessagesByGroupIdOutput>;
  getMessagesByMeetingId(params: GetMessagesByMeetingIdInput): Promise<GetMessagesByMeetingIdOutput>;
  updateMessageByUserId(params: UpdateMessageByUserIdInput): Promise<UpdateMessageByUserIdOutput>;
}

export type Reaction = ReactionEntity;
export type Message = MessageEntity;
export interface CreateFriendMessageInput {
  to: UserId;
  from: UserId;
  transcript: string;
}

export interface CreateFriendMessageOutput {
  message: Message;
}

export interface CreateGroupMessageInput {
  groupId: GroupId;
  from: UserId;
  transcript: string;
}

export interface CreateGroupMessageOutput {
  message: Message;
}

export interface CreateMeetingMessageInput {
  meetingId: MeetingId;
  from: UserId;
  transcript: string;
}

export interface CreateMeetingMessageOutput {
  message: Message;
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

interface CreateMessageInput {
  conversationId: ConversationId;
  from: UserId;
  transcript: string;
}

interface CreateMessageOutput {
  message: Message;
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
