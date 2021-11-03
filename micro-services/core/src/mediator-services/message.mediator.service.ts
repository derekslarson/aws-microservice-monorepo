/* eslint-disable no-return-assign */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-nested-ternary */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { MessageServiceInterface, Message as MessageEntity } from "../entity-services/message.service";
import { ConversationId } from "../types/conversationId.type";
import { UserId } from "../types/userId.type";
import { MessageId } from "../types/messageId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { ConversationServiceInterface, GroupConversation, MeetingConversation } from "../entity-services/conversation.service";
import { PendingMessage as PendingMessageEntity, PendingMessageServiceInterface } from "../entity-services/pendingMessage.service";
import { PendingMessageId } from "../types/pendingMessageId.type";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { User, UserServiceInterface } from "../entity-services/user.service";
import { UpdateMessageReactionAction } from "../enums/updateMessageReactionAction.enum";
import { ConversationType } from "../enums/conversationType.enum";
import { FriendConvoId } from "../types/friendConvoId.type";

@injectable()
export class MessageMediatorService implements MessageMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.PendingMessageServiceInterface) private pendingMessageService: PendingMessageServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createFriendMessage(params: CreateFriendMessageInput): Promise<CreateFriendMessageOutput> {
    try {
      this.loggerService.trace("createFriendMessage called", { params }, this.constructor.name);

      const { to, from, mimeType } = params;

      const { conversation } = await this.conversationService.getFriendConversationByUserIds({ userIds: [ to, from ] });

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageService.createPendingMessage({ conversationId: conversation.id, from, mimeType });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId: pendingMessageEntity.id });

      const { conversationId, ...restOfPendingMessageEntity } = pendingMessageEntity;

      const { users: [ toUser, fromUser ] } = await this.userService.getUsers({ userIds: [ to, from ] });
      const pendingMessage = {
        ...restOfPendingMessageEntity,
        to: toUser,
        from: fromUser,
        type: ConversationType.Friend,
        id: messageId,
      };

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in createFriendMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createGroupMessage(params: CreateGroupMessageInput): Promise<CreateGroupMessageOutput> {
    try {
      this.loggerService.trace("createGroupMessage called", { params }, this.constructor.name);

      const { groupId, from, mimeType } = params;

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageService.createPendingMessage({ conversationId: groupId, from, mimeType });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId: pendingMessageEntity.id });

      const { conversationId, ...restOfPendingMessageEntity } = pendingMessageEntity;

      const [ { conversation: toGroup }, { user: fromUser } ] = await Promise.all([
        this.conversationService.getConversation({ conversationId: groupId }),
        this.userService.getUser({ userId: from }),
      ]);

      const pendingMessage = {
        ...restOfPendingMessageEntity,
        to: toGroup,
        from: fromUser,
        type: ConversationType.Group,
        id: messageId,
      };

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createMeetingMessage(params: CreateMeetingMessageInput): Promise<CreateMeetingMessageOutput> {
    try {
      this.loggerService.trace("createMeetingMessage called", { params }, this.constructor.name);

      const { meetingId, from, mimeType } = params;

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageService.createPendingMessage({ conversationId: meetingId, from, mimeType });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId: pendingMessageEntity.id });

      const { conversationId, ...restOfPendingMessageEntity } = pendingMessageEntity;

      const [ { conversation: toMeeting }, { user: fromUser } ] = await Promise.all([
        this.conversationService.getConversation({ conversationId: meetingId }),
        this.userService.getUser({ userId: from }),
      ]);

      const pendingMessage = {
        ...restOfPendingMessageEntity,
        to: toMeeting,
        from: fromUser,
        type: ConversationType.Meeting,
        id: messageId,
      };

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async convertPendingToRegularMessage(params: ConvertPendingToRegularMessageInput): Promise<ConvertPendingToRegularMessageOutput> {
    try {
      this.loggerService.trace("convertPendingToRegularMessage called", { params }, this.constructor.name);

      const { pendingMessageId, transcript } = params;

      const { pendingMessage: { conversationId, from: fromId, replyTo, mimeType, title } } = await this.pendingMessageService.getPendingMessage({ pendingMessageId });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId });

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId });

      const timestamp = new Date().toISOString();

      const seenAt: Record<string, string | null> = {};
      conversationUserRelationships.forEach((relationship) => {
        seenAt[relationship.userId] = relationship.userId === fromId ? timestamp : null;
      });

      const { message: messageEntity } = await this.messageService.createMessage({ messageId, conversationId, from: fromId, replyTo, mimeType, transcript, seenAt, title });

      await Promise.all(conversationUserRelationships.map((relationship) => this.conversationUserRelationshipService.addMessageToConversationUserRelationship({
        conversationId,
        userId: relationship.userId,
        messageId: messageEntity.id,
        sender: relationship.userId === fromId,
        updateUpdatedAt: true,
      })));

      await this.pendingMessageService.deletePendingMessage({ pendingMessageId });

      const { message } = await this.getMessage({ messageId });

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

      const { message: messageEntity } = await this.messageService.getMessage({ messageId });

      const { conversation } = await this.conversationService.getConversation({ conversationId: messageEntity.conversationId });

      let to: To;
      let from: User;

      if (conversation.type === ConversationType.Friend) {
        const { userIds } = this.conversationService.getUserIdsFromFriendConversationId({ conversationId: conversation.id });
        const { users } = await this.userService.getUsers({ userIds });

        to = users.find((user) => user.id !== messageEntity.from) as User;
        from = users.find((user) => user.id === messageEntity.from) as User;
      } else {
        const { user } = await this.userService.getUser({ userId: messageEntity.from });

        to = conversation;
        from = user;
      }

      const { conversationId, ...restOfMessageEntity } = messageEntity;

      const message = {
        ...restOfMessageEntity,
        to,
        from,
        type: conversation.type,
      };

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

  public async getMessagesByUserIdAndSearchTerm(params: GetMessagesByUserIdAndSearchTermInput): Promise<GetMessagesByUserIdAndSearchTermOutput> {
    try {
      this.loggerService.trace("getMessagesByUserIdAndSearchTerm called", { params }, this.constructor.name);

      const { userId, searchTerm, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({ userId });

      const conversationIds = conversationUserRelationships.map((relationship) => relationship.conversationId);

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageService.getMessagesBySearchTerm({ conversationIds, searchTerm, exclusiveStartKey, limit });

      const userIdSet = new Set<UserId>();
      const groupMeetingIdSet = new Set<GroupId | MeetingId>();

      const messagesWithEntityId = messageEntities.map((message) => {
        userIdSet.add(message.from);

        if (message.conversationId.startsWith(KeyPrefix.FriendConversation)) {
          const { userIds: conversationMemberIds } = this.conversationService.getUserIdsFromFriendConversationId({ conversationId: message.conversationId as FriendConvoId });
          conversationMemberIds.forEach((memberId) => userIdSet.add(memberId));
          const [ toUserId ] = conversationMemberIds.filter((memberId) => memberId !== message.from);

          return { ...message, toEntityId: toUserId };
        }

        groupMeetingIdSet.add(message.conversationId as GroupId | MeetingId);

        return { ...message, toEntityId: message.conversationId };
      });

      const [ { users }, { conversations: groupsAndMeetings } ] = await Promise.all([
        this.userService.getUsers({ userIds: Array.from(userIdSet) }),
        this.conversationService.getConversations({ conversationIds: Array.from(groupMeetingIdSet) }),
      ]);

      const entityMap: Record<string, User | GroupConversation | MeetingConversation> = {};
      [ ...users, ...groupsAndMeetings ].forEach((toEntity) => entityMap[toEntity.id] = toEntity);

      const messages = messagesWithEntityId.map((message) => {
        const { conversationId, toEntityId, ...restOfMessage } = message;

        const to = entityMap[toEntityId];
        const from = entityMap[message.from] as User;

        return {
          ...restOfMessage,
          type: "type" in to ? to.type : ConversationType.Friend,
          to,
          from,
        };
      });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByUserIdAndSearchTerm", { error, params }, this.constructor.name);

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

  public async updateFriendMessagesByUserId(params: UpdateFriendMessagesByUserIdInput): Promise<UpdateFriendMessagesByUserIdOutput> {
    try {
      this.loggerService.trace("updateFriendMessagesByUserId called", { params }, this.constructor.name);

      const { userId, friendId, updates } = params;

      const { conversation } = await this.conversationService.getFriendConversationByUserIds({ userIds: [ userId, friendId ] });

      await this.updateConversationMessagesByUserId({ userId, conversationId: conversation.id, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateFriendMessagesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGroupMessagesByUserId(params: UpdateGroupMessagesByUserIdInput): Promise<UpdateGroupMessagesByUserIdOutput> {
    try {
      this.loggerService.trace("updateGroupMessagesByUserId called", { params }, this.constructor.name);

      const { userId, groupId, updates } = params;

      await this.updateConversationMessagesByUserId({ userId, conversationId: groupId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroupMessagesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMeetingMessagesByUserId(params: UpdateMeetingMessagesByUserIdInput): Promise<UpdateMeetingMessagesByUserIdOutput> {
    try {
      this.loggerService.trace("updateMeetingMessagesByUserId called", { params }, this.constructor.name);

      const { userId, meetingId, updates } = params;

      await this.updateConversationMessagesByUserId({ userId, conversationId: meetingId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeetingMessagesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateConversationMessagesByUserId(params: UpdateConversationMessagesByUserIdInput): Promise<UpdateConversationMessagesByUserIdOutput> {
    try {
      this.loggerService.trace("updateConversationMessagesByUserId called", { params }, this.constructor.name);

      const { userId, conversationId, updates: { seen } } = params;

      const updatePromises: Promise<unknown>[] = [];

      if (typeof seen === "boolean") {
        const { conversationUserRelationship } = await this.conversationUserRelationshipService.getConversationUserRelationship({
          userId,
          conversationId,
        });

        const { unreadMessages = [] } = conversationUserRelationship;

        updatePromises.push(...unreadMessages.map((messageId) => this.updateMessageSeenAt({ messageId, userId, seen })));
      }

      await Promise.all(updatePromises);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversationMessagesByUserId", { error, params }, this.constructor.name);

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
        await this.conversationUserRelationshipService.removeUnreadMessageFromConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });
      } else {
        await this.conversationUserRelationshipService.addMessageToConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageSeenAt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey, limit } = params;

      const [ { messages: messageEntities, lastEvaluatedKey }, { conversation } ] = await Promise.all([
        this.messageService.getMessagesByConversationId({ conversationId, exclusiveStartKey, limit }),
        this.conversationService.getConversation({ conversationId }),
      ]);

      // create a set of all the sending users' ids so that we can fetch them
      const userIdsSet = new Set(messageEntities.map((messageEntity) => messageEntity.from));

      // if the convo is a friend conversation, we need to make sure to include each of the member's ids in the set,
      // as each message will be to one of them
      if (conversation.type === ConversationType.Friend) {
        const { userIds } = this.conversationService.getUserIdsFromFriendConversationId({ conversationId: conversation.id });

        userIds.forEach((userId) => userIdsSet.add(userId));
      }

      const { users } = await this.userService.getUsers({ userIds: Array.from(userIdsSet) });

      // Create a map so we can look up the users by id with O(1) time complexity
      const usersMap: Record<string, User> = {};
      users.forEach((user) => usersMap[user.id] = user);

      const messages = messageEntities.map((messageEntity) => {
        const { conversationId: _, ...restOfMessageEntity } = messageEntity;

        const baseMessage = {
          ...restOfMessageEntity,
          type: conversation.type,
          from: usersMap[messageEntity.from],
        };

        if (conversation.type === ConversationType.Friend) {
          const { userIds: conversationMemberIds } = this.conversationService.getUserIdsFromFriendConversationId({ conversationId: conversation.id });
          const [ toUserId ] = conversationMemberIds.filter((userId) => userId !== messageEntity.from);

          return {
            ...baseMessage,
            to: usersMap[toUserId],
          };
        }

        return {
          ...baseMessage,
          to: conversation,
        };
      });

      return { messages, lastEvaluatedKey };
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
  getMessagesByUserIdAndSearchTerm(params: GetMessagesByUserIdAndSearchTermInput): Promise<GetMessagesByUserIdAndSearchTermOutput>;
  updateMessageByUserId(params: UpdateMessageByUserIdInput): Promise<UpdateMessageByUserIdOutput>;
  updateFriendMessagesByUserId(params: UpdateFriendMessagesByUserIdInput): Promise<UpdateFriendMessagesByUserIdOutput>;
  updateMeetingMessagesByUserId(params: UpdateMeetingMessagesByUserIdInput): Promise<UpdateMeetingMessagesByUserIdOutput>;
  updateGroupMessagesByUserId(params: UpdateGroupMessagesByUserIdInput): Promise<UpdateGroupMessagesByUserIdOutput>;
}

type To = User | GroupConversation | MeetingConversation;

export interface PendingMessage extends Omit<PendingMessageEntity, "id" | "conversationId" | "from"> {
  id: MessageId;
  from: User;
  to: To;
  type: ConversationType;
}

export interface Message extends Omit<MessageEntity, "conversationId" | "from"> {
  from: User;
  to: To;
  type: ConversationType;
}

export interface CreateFriendMessageInput {
  to: UserId;
  from: UserId;
  mimeType: MessageMimeType;
}

export interface CreateFriendMessageOutput {
  pendingMessage: PendingMessage;
}

export interface CreateGroupMessageInput {
  groupId: GroupId;
  from: UserId;
  mimeType: MessageMimeType;
}

export interface CreateGroupMessageOutput {
  pendingMessage: PendingMessage;
}

export interface CreateMeetingMessageInput {
  meetingId: MeetingId;
  from: UserId;
  mimeType: MessageMimeType;
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

export interface GetMessagesByUserIdAndSearchTermInput {
  userId: UserId;
  searchTerm: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByUserIdAndSearchTermOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

interface ReactionChange {
  reaction: string;
  action: UpdateMessageReactionAction;
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

export interface UpdateFriendMessagesByUserIdInput {
  userId: UserId;
  friendId: UserId;
  updates: {
    seen?: boolean;
  }
}

export type UpdateFriendMessagesByUserIdOutput = void;

export interface UpdateGroupMessagesByUserIdInput {
  userId: UserId;
  groupId: GroupId;
  updates: {
    seen?: boolean;
  }
}

export type UpdateGroupMessagesByUserIdOutput = void;

export interface UpdateMeetingMessagesByUserIdInput {
  userId: UserId;
  meetingId: MeetingId;
  updates: {
    seen?: boolean;
  }
}

export type UpdateMeetingMessagesByUserIdOutput = void;

export interface ConvertPendingToRegularMessageInput {
  pendingMessageId: PendingMessageId;
  transcript: string;
}

export interface ConvertPendingToRegularMessageOutput {
  message: Message;
}

interface UpdateConversationMessagesByUserIdInput {
  userId: UserId;
  conversationId: ConversationId;
  updates: {
    seen?: boolean;
  }
}

type UpdateConversationMessagesByUserIdOutput = void;

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

interface ConvertPendingToRegularMessageIdInput {
  pendingMessageId: PendingMessageId;
}

interface ConvertPendingToRegularMessageIdOutput {
  messageId: MessageId;
}
