/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { ConversationId, ConversationType, GroupId, LoggerServiceInterface, MeetingId, MessageId, OneOnOneId, UserId } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { Meeting as MeetingEntity, MeetingServiceInterface } from "../tier-1/meeting.service";
import { Group as GroupEntity, GroupServiceInterface } from "../tier-1/group.service";
import { Message as MessageEntity, MessageServiceInterface } from "../tier-1/message.service";
import { User as UserEntity, UserServiceInterface } from "../tier-1/user.service";
import { KeyPrefix } from "../../enums/keyPrefix.enum";

@injectable()
export class MessageFetchingService implements MessageFetchingServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
  ) {}

  public async getMessage(params: GetMessageInput): Promise<GetMessageOutput> {
    try {
      this.loggerService.trace("getMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      const { message: messageEntity } = await this.messageService.getMessage({ messageId });

      let toEntity: GroupEntity | MeetingEntity | UserEntity;
      let conversationType: ConversationType;

      if (messageEntity.conversationId.startsWith(KeyPrefix.Group)) {
        ({ group: toEntity } = await this.groupService.getGroup({ groupId: messageEntity.conversationId as GroupId }));
        conversationType = ConversationType.Group;
      } else if (messageEntity.conversationId.startsWith(KeyPrefix.Meeting)) {
        ({ meeting: toEntity } = await this.meetingService.getMeeting({ meetingId: messageEntity.conversationId as MeetingId }));
        conversationType = ConversationType.Meeting;
      } else {
        const toUserId = messageEntity.conversationId.split(/_(?=user_)/).find((userId) => messageEntity.from !== userId);
        ({ user: toEntity } = await this.userService.getUser({ userId: toUserId as UserId }));
        conversationType = ConversationType.OneOnOne;
      }

      const { user: fromUser } = await this.userService.getUser({ userId: messageEntity.from });

      const { from, ...restOfMessageEntity } = messageEntity;

      const message: Message = {
        ...restOfMessageEntity,
        from: fromUser,
        to: toEntity,
        type: conversationType,
      };

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId<T extends ConversationId, U extends UserId>(params: GetMessagesByConversationIdInput<T, U>): Promise<GetMessagesByConversationIdOutput<T>> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, requestingUserId, newOnly, searchTerm, limit, exclusiveStartKey } = params;

      const { messages: messageEntities, lastEvaluatedKey } = searchTerm
        ? await this.messageService.getMessagesBySearchTerm({ conversationIds: [ conversationId ], searchTerm, limit, exclusiveStartKey })
        : await this.messageService.getMessagesByConversationId({ conversationId, requestingUserId, newOnly, limit, exclusiveStartKey });

      const userIdSet = new Set<UserId>();
      messageEntities.forEach((messageEntity) => userIdSet.add(messageEntity.from));

      let toEntity: GroupEntity | MeetingEntity | undefined;
      let conversationType: ConversationType;

      if (conversationId.startsWith(KeyPrefix.Group)) {
        ({ group: toEntity } = await this.groupService.getGroup({ groupId: conversationId as GroupId }));
        conversationType = ConversationType.Group;
      } else if (conversationId.startsWith(KeyPrefix.Meeting)) {
        ({ meeting: toEntity } = await this.meetingService.getMeeting({ meetingId: conversationId as MeetingId }));
        conversationType = ConversationType.Meeting;
      } else {
        conversationId.split(/_(?=user_)/).forEach((userId) => userIdSet.add(userId as UserId));
        conversationType = ConversationType.OneOnOne;
      }

      const { users } = await this.userService.getUsers({ userIds: Array.from(userIdSet) });

      const userMap: Record<string, UserEntity> = {};
      users.forEach((user) => userMap[user.id] = user);

      const messages = await Promise.all(messageEntities.map(({ from, ...restOfMessageEntity }) => ({
        ...restOfMessageEntity,
        from: userMap[from],
        to: toEntity || userMap[conversationId.split(/_(?=user_)/).find((userId) => userId !== from) as UserId],
        type: conversationType,
      } as Message<T>)));

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByUserIdAndSearchTerm(params: GetMessagesByUserIdAndSearchTermInput): Promise<GetMessagesByUserIdAndSearchTermOutput> {
    try {
      this.loggerService.trace("getMessagesByUserIdAndSearchTerm called", { params }, this.constructor.name);

      const { userId, searchTerm, limit, exclusiveStartKey } = params;

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageService.getMessagesBySearchTerm({ userId, searchTerm, limit, exclusiveStartKey });

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

      const entityMap: Record<string, UserEntity | GroupEntity | MeetingEntity> = {};
      users.forEach((user) => entityMap[user.id] = user);
      groups.forEach((group) => entityMap[group.id] = group);
      meetings.forEach((meeting) => entityMap[meeting.id] = meeting);

      const messages = await Promise.all(messageEntities.map(({ from, ...restOfMessageEntity }) => {
        const { conversationType } = this.getConversationTypeFromConversationId({ conversationId: restOfMessageEntity.conversationId });
        const to = conversationType === ConversationType.OneOnOne ? restOfMessageEntity.conversationId.split(/_(?=user_)/).find((id) => id !== from) as UserId : restOfMessageEntity.conversationId;

        return {
          ...restOfMessageEntity,
          from: entityMap[from],
          to: entityMap[to],
          type: conversationType,
        } as Message;
      }));

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByUserIdAndSearchTerm", { error, params }, this.constructor.name);

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

export interface MessageFetchingServiceInterface {
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessagesByUserIdAndSearchTerm(params: GetMessagesByUserIdAndSearchTermInput): Promise<GetMessagesByUserIdAndSearchTermOutput>;
  getMessagesByConversationId<T extends ConversationId, U extends UserId>(params: GetMessagesByConversationIdInput<T, U>): Promise<GetMessagesByConversationIdOutput<T>>;
}

export type Message<T extends ConversationId | void = void> = Omit<MessageEntity, "from"> & {
  type: ConversationType;
  from: UserEntity;
  to: T extends OneOnOneId ? UserEntity : T extends GroupId ? GroupEntity : T extends MeetingId ? MeetingEntity : UserEntity | GroupEntity | MeetingEntity;
};

export interface GetMessageInput {
  messageId: MessageId;
}

export interface GetMessageOutput {
  message: Message;
}

export interface GetMessagesByConversationIdInput<T extends ConversationId, U extends UserId> {
  conversationId: T;
  requestingUserId?: U;
  newOnly?: U extends UserId ? boolean : never;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByConversationIdOutput<T extends ConversationId> {
  messages: Message<T>[];
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

interface GetConversationTypeFromConversationIdInput {
  conversationId: ConversationId;
}

interface GetConversationTypeFromConversationIdOutput {
  conversationType: ConversationType;
}
