import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface, Conversation as ConversationEntity } from "../entity-services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { UserId } from "../types/userId.type";
import { ConversationType } from "../enums/conversationType.enum";
import { ConversationId } from "../types/conversationId.type";
import { Message as MessageEntity, MessageServiceInterface } from "../entity-services/message.service";
import { MessageId } from "../types/messageId.type";

@injectable()
export class ConversationMediatorService implements ConversationMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { params }, this.constructor.name);

      const { userId, type, unread, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({
        userId,
        exclusiveStartKey,
        type: type === "meeting_due_date" ? "due_date" : type,
        unread,
        limit,
      });

      const conversationIds = conversationUserRelationships.map((relationship) => relationship.conversationId);
      const recentMessageIds = conversationUserRelationships.map((relationship) => relationship.recentMessageId).filter((messageId) => !!messageId) as MessageId[];

      const [ { conversations }, { messages: recentMessages } ] = await Promise.all([
        this.conversationService.getConversations({ conversationIds }),
        this.messageService.getMessages({ messageIds: recentMessageIds }),
      ]);

      const recentMessageMap = recentMessages.reduce((acc: { [key: string]: Message; }, message, i) => {
        acc[message.id] = message;

        return acc;
      }, {});

      const conversationsWithRolesAndMessageProps = conversations.map((conversation, i) => {
        const conversationUserRelationship = conversationUserRelationships[i];

        return {
          ...conversation,
          updatedAt: conversationUserRelationship.updatedAt,
          recentMessage: conversationUserRelationship.recentMessageId ? recentMessageMap[conversationUserRelationship.recentMessageId] : undefined,
          unreadMessages: conversationUserRelationship.unreadMessages?.length || 0,
          role: conversationUserRelationship.role,
        };
      });

      return { conversations: conversationsWithRolesAndMessageProps, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput> {
    try {
      this.loggerService.trace("isConversationMember called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      await this.conversationUserRelationshipService.getConversationUserRelationship({
        conversationId,
        userId,
      });

      return { isConversationMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isConversationMember: false };
      }
      this.loggerService.error("Error in isConversationMember", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationMediatorServiceInterface {
  getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
  isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput>;
}

export type Message = MessageEntity;

export interface Conversation extends ConversationEntity {
  unreadMessages: number;
  recentMessage?: Message;
}

export interface GetConversationsByUserIdInput {
  userId: UserId;
  type?: ConversationType | "meeting_due_date";
  unread?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationsByUserIdOutput {
  conversations: WithRole<Conversation>[];
  lastEvaluatedKey?: string;
}

export interface IsConversationMemberInput {
  conversationId: ConversationId;
  userId: UserId;
}

export interface IsConversationMemberOutput {
  isConversationMember: boolean;
}
