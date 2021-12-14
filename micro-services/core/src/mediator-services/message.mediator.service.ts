/* eslint-disable no-return-assign */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-nested-ternary */
import { inject, injectable } from "inversify";
import { ConversationId, GroupId, LoggerServiceInterface, MeetingId, MessageId, OneOnOneId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MessageServiceInterface, Message as MessageEntity } from "../entity-services/message.service";

import { Group, GroupServiceInterface } from "../entity-services/group.service";
import { PendingMessage as PendingMessageEntity, PendingMessageServiceInterface } from "../entity-services/pendingMessage.service";

import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { User, UserServiceInterface } from "../entity-services/user.service";
import { UpdateMessageReactionAction } from "../enums/updateMessageReactionAction.enum";
import { ConversationType } from "../enums/conversationType.enum";
import { Meeting, MeetingServiceInterface } from "../entity-services/meeting.service";
import { MembershipServiceInterface } from "../entity-services/membership.service";
import { MembershipFetchType } from "../enums/membershipFetchType.enum";

@injectable()
export class MessageMediatorService implements MessageMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.PendingMessageServiceInterface) private pendingMessageService: PendingMessageServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async createOneOnOneMessage(params: CreateOneOnOneMessageInput): Promise<CreateOneOnOneMessageOutput> {
    try {
      this.loggerService.trace("createOneOnOneMessage called", { params }, this.constructor.name);

      const { oneOnOneId, from, mimeType } = params;

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageService.createPendingMessage({ conversationId: oneOnOneId, from, mimeType });

      const { conversationId, ...restOfPendingMessageEntity } = pendingMessageEntity;

      const [ userIdA, userIdB ] = conversationId.split(/_(?=user_)/) as UserId[];
      const to = userIdA === from ? userIdB : userIdA;

      const { users: [ toUser, fromUser ] } = await this.userService.getUsers({ userIds: [ to, from ] });

      const pendingMessage = {
        ...restOfPendingMessageEntity,
        to: toUser,
        from: fromUser,
        type: ConversationType.OneOnOne,
        id: pendingMessageEntity.id,
      };

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOneMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createGroupMessage(params: CreateGroupMessageInput): Promise<CreateGroupMessageOutput> {
    try {
      this.loggerService.trace("createGroupMessage called", { params }, this.constructor.name);

      const { groupId, from, mimeType } = params;

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageService.createPendingMessage({ conversationId: groupId, from, mimeType });

      const { conversationId, ...restOfPendingMessageEntity } = pendingMessageEntity;

      const [ { group }, { user } ] = await Promise.all([
        this.groupService.getGroup({ groupId }),
        this.userService.getUser({ userId: from }),
      ]);

      const pendingMessage = {
        ...restOfPendingMessageEntity,
        to: group,
        from: user,
        type: ConversationType.Group,
        id: pendingMessageEntity.id,
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

      const { conversationId, ...restOfPendingMessageEntity } = pendingMessageEntity;

      const [ { meeting }, { user } ] = await Promise.all([
        this.meetingService.getMeeting({ meetingId }),
        this.userService.getUser({ userId: from }),
      ]);

      const pendingMessage = {
        ...restOfPendingMessageEntity,
        to: meeting,
        from: user,
        type: ConversationType.Meeting,
        id: pendingMessageEntity.id,
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

      const { messageId, transcript } = params;

      const { pendingMessage: { conversationId, from: fromId, replyTo, mimeType, title } } = await this.pendingMessageService.getPendingMessage({ messageId });

      const { memberships } = await this.membershipService.getMembershipsByEntityId({ entityId: conversationId });

      const now = new Date().toISOString();

      const seenAt: Record<string, string | null> = {};
      memberships.forEach((membership) => seenAt[membership.userId] = membership.userId === fromId ? now : null);

      await this.messageService.createMessage({ messageId, conversationId, from: fromId, replyTo, mimeType, transcript, seenAt, title });

      const [ { message } ] = await Promise.all([
        this.getMessage({ messageId }),
        this.pendingMessageService.deletePendingMessage({ messageId }),
        Promise.all(memberships.map(({ userId }) => this.membershipService.incrementUnreadMessages({ entityId: conversationId, userId }))),
      ]);

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

      const { conversationType } = this.getConversationTypeFromConversationId({ conversationId: messageEntity.conversationId });

      let to: To;
      if (conversationType === ConversationType.Group) {
        ({ group: to } = await this.groupService.getGroup({ groupId: messageEntity.conversationId as GroupId }));
      } else if (conversationType === ConversationType.Meeting) {
        ({ meeting: to } = await this.meetingService.getMeeting({ meetingId: messageEntity.conversationId as MeetingId }));
      } else {
        const [ userIdA, userIdB ] = messageEntity.conversationId.split(/_(?=user_)/) as UserId[];
        const toUserId = userIdA === messageEntity.from ? userIdB : userIdA;

        if (!toUserId) {
          throw new Error(`Malformed conversationId: ${messageEntity.conversationId}`);
        }

        ({ user: to } = await this.userService.getUser({ userId: toUserId }));
      }

      const { user: from } = await this.userService.getUser({ userId: messageEntity.from });

      const { conversationId, ...restOfMessageEntity } = messageEntity;

      const message = {
        ...restOfMessageEntity,
        to,
        from,
        type: conversationType,
      };

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByOneOnOneId(params: GetMessagesByOneOnOneIdInput): Promise<GetMessagesByOneOnOneIdOutput> {
    try {
      this.loggerService.trace("getMessagesByOneOnOneId called", { params }, this.constructor.name);

      const { requestingUserId, oneOnOneId, newOnly, exclusiveStartKey, limit } = params;

      const { membership } = await this.membershipService.getMembership({ userId: requestingUserId, entityId: oneOnOneId });

      const minCreatedAt = newOnly ? membership.activeAt : undefined;
      const userIds = oneOnOneId.split(/_(?=user_)/) as UserId[];

      const [ { messages: messageEntities, lastEvaluatedKey }, { users: [ user, otherUser ] } ] = await Promise.all([
        this.messageService.getMessagesByConversationId({ conversationId: oneOnOneId, minCreatedAt, exclusiveStartKey, limit }),
        this.userService.getUsers({ userIds }),
      ]);

      const messages = messageEntities.map((messageEntity) => {
        const { conversationId: _, from, ...restOfMessage } = messageEntity;

        return {
          to: from === user.id ? otherUser : user,
          from: from === user.id ? user : otherUser,
          type: ConversationType.OneOnOne,
          new: messageEntity.createdAt > membership.activeAt,
          ...restOfMessage,
        };
      });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByOneOnOneId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByGroupId(params: GetMessagesByGroupIdInput): Promise<GetMessagesByGroupIdOutput> {
    try {
      this.loggerService.trace("getMessagesByGroupId called", { params }, this.constructor.name);

      const { requestingUserId, groupId, newOnly, exclusiveStartKey, limit } = params;

      const { membership } = await this.membershipService.getMembership({ userId: requestingUserId, entityId: groupId });

      const minCreatedAt = newOnly ? membership.activeAt : undefined;

      const [ { messages: messageEntities, lastEvaluatedKey }, { group } ] = await Promise.all([
        this.messageService.getMessagesByConversationId({ conversationId: groupId, minCreatedAt, exclusiveStartKey, limit }),
        this.groupService.getGroup({ groupId }),
      ]);

      const userIds = Array.from(new Set(messageEntities.map((messageEntity) => messageEntity.from)));

      const { users } = await this.userService.getUsers({ userIds });

      const userMap: Record<UserId, User> = {};
      users.forEach((user) => userMap[user.id] = user);

      const messages = messageEntities.map((messageEntity) => {
        const { conversationId: _, from, ...restOfMessage } = messageEntity;

        return {
          to: group,
          from: userMap[from] as User,
          type: ConversationType.OneOnOne,
          new: messageEntity.createdAt > membership.activeAt,
          ...restOfMessage,
        };
      });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByGroupId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByMeetingId(params: GetMessagesByMeetingIdInput): Promise<GetMessagesByMeetingIdOutput> {
    try {
      this.loggerService.trace("getMessagesByMeetingId called", { params }, this.constructor.name);

      const { requestingUserId, meetingId, newOnly, exclusiveStartKey, limit } = params;

      const { membership } = await this.membershipService.getMembership({ userId: requestingUserId, entityId: meetingId });

      const minCreatedAt = newOnly ? membership.activeAt : undefined;

      const [ { messages: messageEntities, lastEvaluatedKey }, { meeting } ] = await Promise.all([
        this.messageService.getMessagesByConversationId({ conversationId: meetingId, minCreatedAt, exclusiveStartKey, limit }),
        this.meetingService.getMeeting({ meetingId }),
      ]);

      const userIds = Array.from(new Set(messageEntities.map((messageEntity) => messageEntity.from)));

      const { users } = await this.userService.getUsers({ userIds });

      const userMap: Record<UserId, User> = {};
      users.forEach((user) => userMap[user.id] = user);

      const messages = messageEntities.map((messageEntity) => {
        const { conversationId: _, from, ...restOfMessage } = messageEntity;

        return {
          to: meeting,
          from: userMap[from] as User,
          type: ConversationType.OneOnOne,
          new: messageEntity.createdAt > membership.activeAt,
          ...restOfMessage,
        };
      });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByMeetingId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByUserIdAndSearchTerm(params: GetMessagesByUserIdAndSearchTermInput): Promise<GetMessagesByUserIdAndSearchTermOutput> {
    try {
      this.loggerService.trace("getMessagesByUserIdAndSearchTerm called", { params }, this.constructor.name);

      const { userId, searchTerm, conversationId: conversationIdParam, exclusiveStartKey, limit } = params;

      const conversationIds = [];

      if (conversationIdParam) {
        conversationIds.push(conversationIdParam);
      } else {
        const [ { memberships: groupMemberships }, { memberships: meetingMemberships }, { memberships: oneOnOneMemberships } ] = await Promise.all([
          this.membershipService.getMembershipsByUserId({ userId, type: MembershipFetchType.Group }),
          this.membershipService.getMembershipsByUserId({ userId, type: MembershipFetchType.Meeting }),
          this.membershipService.getMembershipsByUserId({ userId, type: MembershipFetchType.OneOnOne }),
        ]);

        const groupIds = groupMemberships.map((groupMembership) => groupMembership.entityId);
        const meetingIds = meetingMemberships.map((meetingMembership) => meetingMembership.entityId);
        const oneOnOneIds = oneOnOneMemberships.map((oneOnOneMembership) => oneOnOneMembership.entityId);

        conversationIds.push(...groupIds, ...meetingIds, ...oneOnOneIds);
      }

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageService.getMessagesBySearchTerm({ conversationIds, searchTerm, exclusiveStartKey, limit });

      const userIdSet = new Set<UserId>();
      const groupIdSet = new Set<GroupId>();
      const meetingIdSet = new Set<MeetingId>();

      messageEntities.forEach((message) => {
        userIdSet.add(message.from);

        const { conversationType } = this.getConversationTypeFromConversationId({ conversationId: message.conversationId });

        if (conversationType === ConversationType.Group) {
          groupIdSet.add(message.conversationId as GroupId);
        } else if (conversationType === ConversationType.Meeting) {
          meetingIdSet.add(message.conversationId as MeetingId);
        } else {
          message.conversationId.split(/_(?=user_)/).forEach((id) => userIdSet.add(id as UserId));
        }
      });

      const [ { users }, { groups }, { meetings } ] = await Promise.all([
        this.userService.getUsers({ userIds: Array.from(userIdSet) }),
        this.groupService.getGroups({ groupIds: Array.from(groupIdSet) }),
        this.meetingService.getMeetings({ meetingIds: Array.from(meetingIdSet) }),
      ]);

      const entityMap: Record<UserId | GroupId | MeetingId, User | Group | Meeting> = {};
      users.forEach((user) => entityMap[user.id] = user);
      groups.forEach((group) => entityMap[group.id] = group);
      meetings.forEach((meeting) => entityMap[meeting.id] = meeting);

      const messages = messageEntities.map((message) => {
        const { conversationId, from, ...restOfMessage } = message;
        const { conversationType } = this.getConversationTypeFromConversationId({ conversationId });

        let to: To;
        if (conversationType === ConversationType.Group || conversationType === ConversationType.Meeting) {
          to = entityMap[conversationId] as Group | Meeting;
        } else {
          const [ userIdA, userIdB ] = conversationId.split(/_(?=user_)/) as UserId[];
          const toUserId = userIdA === from ? userIdB : userIdA;

          if (!toUserId) {
            throw new Error(`Malformed conversationId: ${conversationId}`);
          }

          to = entityMap[toUserId] as User;
        }

        return {
          ...restOfMessage,
          to,
          from: entityMap[from] as User,
          type: conversationType,
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
        updatePromises.push(this.messageService.markMessageSeen({ messageId, userId }));
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

  public async updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput> {
    try {
      this.loggerService.trace("updateMessage called", { params }, this.constructor.name);

      const { messageId, updates } = params;

      await this.messageService.updateMessage({ messageId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private getConversationTypeFromConversationId(params: GetConversationTypeFromConversationIdInput): GetConversationTypeFromConversationIdOutput {
    try {
      this.loggerService.trace("getConversationTypeFromConversationId called", { params }, this.constructor.name);

      const { conversationId } = params;

      if (conversationId.startsWith(KeyPrefix.Group)) {
        return { conversationType: ConversationType.Group };
      }

      if (conversationId.startsWith(KeyPrefix.Meeting)) {
        return { conversationType: ConversationType.Meeting };
      }

      return { conversationType: ConversationType.OneOnOne };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationTypeFromConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageMediatorServiceInterface {
  createOneOnOneMessage(params: CreateOneOnOneMessageInput): Promise<CreateOneOnOneMessageOutput>;
  createGroupMessage(params: CreateGroupMessageInput): Promise<CreateGroupMessageOutput>;
  createMeetingMessage(params: CreateMeetingMessageInput): Promise<CreateMeetingMessageOutput>;
  convertPendingToRegularMessage(params: ConvertPendingToRegularMessageInput): Promise<ConvertPendingToRegularMessageOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessagesByOneOnOneId(params: GetMessagesByOneOnOneIdInput): Promise<GetMessagesByOneOnOneIdOutput>;
  getMessagesByGroupId(params: GetMessagesByGroupIdInput): Promise<GetMessagesByGroupIdOutput>;
  getMessagesByMeetingId(params: GetMessagesByMeetingIdInput): Promise<GetMessagesByMeetingIdOutput>;
  getMessagesByUserIdAndSearchTerm(params: GetMessagesByUserIdAndSearchTermInput): Promise<GetMessagesByUserIdAndSearchTermOutput>;
  updateMessageByUserId(params: UpdateMessageByUserIdInput): Promise<UpdateMessageByUserIdOutput>;
  updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput>;
}

type To = User | Group | Meeting;

export interface PendingMessage extends Omit<PendingMessageEntity, "conversationId" | "from"> {
  id: MessageId;
  from: User;
  to: To;
  type: ConversationType;
}

export interface Message extends Omit<MessageEntity, "conversationId" | "from"> {
  from: User;
  to: To;
  type: ConversationType;
  new?: boolean;
}

export interface CreateOneOnOneMessageInput {
  oneOnOneId: OneOnOneId;
  from: UserId;
  mimeType: MessageMimeType;
}

export interface CreateOneOnOneMessageOutput {
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
  requestingUserId?: UserId;
}

export interface GetMessageOutput {
  message: Message;
}

export interface GetMessagesByOneOnOneIdInput {
  requestingUserId: UserId;
  oneOnOneId: OneOnOneId;
  newOnly?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByOneOnOneIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesByGroupIdInput {
  requestingUserId: UserId;
  groupId: GroupId;
  newOnly?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByGroupIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesByMeetingIdInput {
  requestingUserId: UserId;
  meetingId: MeetingId;
  newOnly?: boolean;
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
  conversationId?: ConversationId;
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
    seen?: true;
    reactions?: ReactionChange[];
  }
}

export interface UpdateMessageByUserIdOutput {
  message: Message;
}

export interface UpdateOneOnOneMessagesByUserIdInput {
  userId: UserId;
  friendId: UserId;
  updates: {
    seen?: boolean;
  }
}

export type UpdateOneOnOneMessagesByUserIdOutput = void;

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

export interface UpdateMessageInput {
  messageId: MessageId;
  updates: {
    transcript: string;
  }
}

export type UpdateMessageOutput = void;

export interface ConvertPendingToRegularMessageInput {
  messageId: MessageId;
  transcript: string;
}

export interface ConvertPendingToRegularMessageOutput {
  message: Message;
}

interface GetConversationTypeFromConversationIdInput {
  conversationId: ConversationId;
}

interface GetConversationTypeFromConversationIdOutput {
  conversationType: ConversationType;
}
