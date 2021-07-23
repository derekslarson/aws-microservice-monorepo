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
import { MessageFileServiceInterface } from "../entity-services/mesage.file.service";
import { FriendConvoId } from "../types/friendConvoId.type";
import { ImageFileServiceInterface } from "../entity-services/image.file.service";
import { UserServiceInterface } from "../entity-services/user.service";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class ConversationMediatorService implements ConversationMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.MessageFileServiceInterface) private messageFileService: MessageFileServiceInterface,
    @inject(TYPES.ImageFileServiceInterface) private imageFileService: ImageFileServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
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

      const recentMessageMap = recentMessages.reduce((acc: { [key: string]: Message; }, message) => {
        const { signedUrl } = this.messageFileService.getSignedUrl({
          messageId: message.id,
          conversationId: message.conversationId,
          mimeType: message.mimeType,
          operation: "get",
        });

        acc[message.id] = { ...message, fetchUrl: signedUrl };

        return acc;
      }, {});

      const conversationsWithRolesAndMessageProps = await Promise.all(conversations.map(async (conversation, i) => {
        const conversationUserRelationship = conversationUserRelationships[i];

        let image: string;

        if (this.isFriendConvo(conversation)) {
          ({ image } = await this.getFriendConversationImage({ conversationId: conversation.id, requestingUserId: userId }));
        } else {
          ({ signedUrl: image } = this.imageFileService.getSignedUrl({
            entityId: conversation.id,
            entityType: conversation.type === ConversationType.Group ? EntityType.GroupConversation : EntityType.MeetingConversation,
            mimeType: conversation.imageMimeType,
            operation: "get",
          }));
        }

        return {
          ...conversation,
          image,
          updatedAt: conversationUserRelationship.updatedAt,
          recentMessage: conversationUserRelationship.recentMessageId ? recentMessageMap[conversationUserRelationship.recentMessageId] : undefined,
          unreadMessages: conversationUserRelationship.unreadMessages?.length || 0,
          role: conversationUserRelationship.role,
        };
      }));

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

  private isFriendConvo(conversation: ConversationEntity): conversation is ConversationEntity<FriendConvoId> {
    try {
      this.loggerService.trace("isFriendConvoId called", { conversation }, this.constructor.name);

      return !("imageMimeType" in conversation);
    } catch (error: unknown) {
      this.loggerService.error("Error in isFriendConvoId", { error, conversation }, this.constructor.name);

      throw error;
    }
  }

  private async getFriendConversationImage(params: GetFriendConversationImageInput): Promise<GetFriendConversationImageOutput> {
    try {
      this.loggerService.trace("getFriendConversationImage called", { params }, this.constructor.name);

      const { conversationId, requestingUserId } = params;

      const userId = conversationId.replace(KeyPrefix.FriendConversation, "").replace(requestingUserId, "").replace(/^-|-$/, "") as UserId;

      const { user } = await this.userService.getUser({ userId });

      const { signedUrl } = this.imageFileService.getSignedUrl({
        operation: "get",
        entityId: user.id,
        entityType: EntityType.User,
        mimeType: user.imageMimeType,
      });

      return { image: signedUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getFriendConversationImage", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationMediatorServiceInterface {
  getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
  isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput>;
}

export interface Message extends MessageEntity {
  fetchUrl: string;
}
export type Conversation<T extends ConversationId = ConversationId> = ConversationEntity<T> & {
  unreadMessages: number;
  recentMessage?: Message;
};

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

export interface GetFriendConversationImageInput {
  conversationId: ConversationId;
  requestingUserId: UserId;
}

export interface GetFriendConversationImageOutput {
  image: string;
}
