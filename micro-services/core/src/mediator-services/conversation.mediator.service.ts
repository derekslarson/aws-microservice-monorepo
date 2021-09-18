/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface, Conversation as ConversationEntity, GroupConversation, MeetingConversation } from "../entity-services/conversation.service";
import { ConversationUserRelationshipServiceInterface, ConversationFetchTypeToConversationType, ConversationUserRelationship } from "../entity-services/conversationUserRelationship.service";
import { UserId } from "../types/userId.type";
import { ConversationType } from "../types/conversationType.type";
import { ConversationType as ConversationTypeEnum } from "../enums/conversationType.enum";
import { ConversationId } from "../types/conversationId.type";
import { Message as MessageEntity, MessageServiceInterface } from "../entity-services/message.service";
import { MessageId } from "../types/messageId.type";
import { User, UserServiceInterface } from "../entity-services/user.service";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { ConversationFetchType } from "../enums/conversationFetchType.enum";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { UserGroupMeetingSearchServiceInterface } from "../entity-services/userGroupMeeting.search.service";

@injectable()
export class ConversationMediatorService implements ConversationMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
    @inject(TYPES.UserGroupMeetingSearchServiceInterface) private userGroupMeetingSearchService: UserGroupMeetingSearchServiceInterface,
  ) {}

  public async getConversationsByUserId<T extends ConversationFetchType>(params: GetConversationsByUserIdInput<T>): Promise<GetConversationsByUserIdOutput<T>> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { params }, this.constructor.name);

      const { userId, type, searchTerm, unread, exclusiveStartKey, limit } = params;

      let lastEvaluatedKey: string | undefined;

      // Fetch all the user's conversationUserRelationships (taking into account type and unread)
      const { conversationUserRelationships, lastEvaluatedKey: dynamoLastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({
        userId,
        type,
        unread,
        // If using a search term, pagination will be handled by calls to the search service.
        // We need every relevant convo id so we can pass them to the search service.
        ...(!searchTerm && { exclusiveStartKey, limit }),
      });

      lastEvaluatedKey = dynamoLastEvaluatedKey;

      // Since the conversationId of a friend convo is `convo-friend-<userIdA>-<userIdB>,
      // we need to convert that into the other user's id as set it as entityId, so that we can fetch the user record
      let relationshipsWithEntityIds: ConversationUserRelationshipWithEntityId<T>[] = conversationUserRelationships.map((relationship) => ({
        ...relationship,
        entityId: relationship.type === ConversationTypeEnum.Friend
          ? relationship.conversationId.replace(KeyPrefix.FriendConversation, "").replace(userId, "").replace(/^-|-$/, "") as UserId
          : relationship.conversationId as GroupId | MeetingId,
      }));

      if (searchTerm) {
        // We need to create a map of convoUserRelationships by their id
        // so that we can recalculate them after the search query with O(1) time complexity
        const relationshipMap = relationshipsWithEntityIds.reduce((acc: Record<string, ConversationUserRelationshipWithEntityId<T>>, relationship) => {
          acc[relationship.entityId] = relationship;
          return acc;
        }, {});

        const entityIds = relationshipsWithEntityIds.map(({ entityId }) => entityId);

        const { usersGroupsAndMeetings, lastEvaluatedKey: searchLastEvaluatedKey } = await this.userGroupMeetingSearchService.getUsersGroupsAndMeetingsBySearchTerm({
          searchTerm,
          entityIds,
          limit,
          exclusiveStartKey,
        });

        lastEvaluatedKey = searchLastEvaluatedKey;

        // Since conversationUserRelationships was initially set with every conversationId,
        // we need to recalculate it with the usersGroupsAndMeetings returned by the search service
        // so they are in the correct order and only contain the relevant ones
        relationshipsWithEntityIds = usersGroupsAndMeetings.map(({ id }) => relationshipMap[id]);
      }

      const conversationIds = relationshipsWithEntityIds.filter((relationship) => relationship.type !== ConversationTypeEnum.Friend).map(({ entityId }) => entityId as GroupId | MeetingId);
      const friendIds = relationshipsWithEntityIds.filter((relationship) => relationship.type === ConversationTypeEnum.Friend).map(({ entityId }) => entityId as UserId);
      const recentMessageIds = relationshipsWithEntityIds.filter(({ recentMessageId }) => !!recentMessageId).map(({ recentMessageId }) => recentMessageId as MessageId);

      const [ { conversations: groupsAndMeetings }, { users: friends }, { recentMessages } ] = await Promise.all([
        this.conversationService.getConversations({ conversationIds }),
        this.userService.getUsers({ userIds: friendIds }),
        this.getRecentMessages({ recentMessageIds }),
      ]);

      const groupAndMeetingMap = groupsAndMeetings.reduce((acc: { [key: string]: GroupConversation | MeetingConversation; }, groupOrMeeting) => {
        acc[groupOrMeeting.id] = groupOrMeeting;
        return acc;
      }, {});

      const friendMap = friends.reduce((acc: { [key: string]: User; }, friend) => {
        acc[friend.id] = friend;
        return acc;
      }, {});

      const recentMessagesMap = recentMessages.reduce((acc: { [key: string]: Message; }, recentMessage) => {
        acc[recentMessage.to === userId ? recentMessage.from : recentMessage.to] = recentMessage;
        return acc;
      }, {});

      const conversations = relationshipsWithEntityIds.map((relationship) => {
        const entity = relationship.type === ConversationTypeEnum.Friend ? friendMap[relationship.entityId] : groupAndMeetingMap[relationship.entityId];

        return {
          ...entity,
          type: relationship.type,
          unreadMessages: relationship.unreadMessages?.length || 0,
          updatedAt: relationship.updatedAt,
          recentMessage: recentMessagesMap[relationship.entityId],
          role: relationship.role,
        } as WithRole<ConversationV2<ConversationFetchTypeToConversationType<T>>>;
      });

      return { conversations, lastEvaluatedKey };
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

  private async getRecentMessages(params: GetRecentMessagesInput): Promise<GetRecentMessagesOutput> {
    try {
      this.loggerService.trace("getRecentMessages called", { params }, this.constructor.name);

      const { recentMessageIds } = params;

      const { messages: recentMessageEntities } = await this.messageService.getMessages({ messageIds: recentMessageIds });

      const userIds = recentMessageEntities.map((message) => message.from);

      const { users } = await this.userService.getUsers({ userIds });

      const recentMessages = recentMessageEntities.map((message, i) => {
        const user = users[i];

        const { conversationId, ...restOfMessage } = message;
        const { to, type } = this.getToAndTypeFromConversationIdAndFrom({ conversationId, from: message.from });

        return {
          ...restOfMessage,
          to,
          type,
          fromImage: user.image,
        };
      });

      return { recentMessages };
    } catch (error: unknown) {
      this.loggerService.error("Error in getRecentMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private getToAndTypeFromConversationIdAndFrom(params: GetToAndTypeFromConversationIdAndFromInput): GetToAndTypeFromConversationIdAndFromOutput {
    try {
      this.loggerService.trace("getToAndTypeFromConversationIdAndFrom called", { params }, this.constructor.name);

      const { from, conversationId } = params;

      if (conversationId.startsWith(KeyPrefix.GroupConversation)) {
        return {
          to: conversationId as GroupId,
          type: ConversationTypeEnum.Group,
        };
      }

      if (conversationId.startsWith(KeyPrefix.MeetingConversation)) {
        return {
          to: conversationId as MeetingId,
          type: ConversationTypeEnum.Meeting,
        };
      }

      const toUserId = conversationId.replace(KeyPrefix.FriendConversation, "").replace(from, "").replace(/^-|-$/, "") as UserId;

      return {
        to: toUserId,
        type: ConversationTypeEnum.Friend,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getToAndTypeFromConversationIdAndFrom", { error, params }, this.constructor.name);

      throw error;
    }
  }
}
export interface ConversationMediatorServiceInterface {
  getConversationsByUserId<T extends ConversationFetchType>(params: GetConversationsByUserIdInput<T>): Promise<GetConversationsByUserIdOutput<T>>;
  isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput>;
}

type To = UserId | GroupId | MeetingId;

export interface Message extends Omit<MessageEntity, "conversationId"> {
  fetchUrl: string;
  fromImage: string;
  to: To;
  type: ConversationType;
}

export type ConversationV2<T extends ConversationType> = Omit<(T extends ConversationTypeEnum.Friend ? User : ConversationEntity<T>), "imageMimeType"> & {
  unreadMessages: number;
  image: string;
  updatedAt: string;
  type: T;
  recentMessage?: Message;
};

export type Conversation<T extends ConversationType> = Omit<ConversationEntity<T>, "imageMimeType"> & {
  unreadMessages: number;
  image: string;
  updatedAt: string;
  recentMessage?: Message;
};

export interface GetConversationsByUserIdInput<T extends ConversationFetchType> {
  userId: UserId;
  type?: T;
  unread?: boolean;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationsByUserIdOutput<T extends ConversationFetchType> {
  conversations: WithRole<ConversationV2<ConversationFetchTypeToConversationType<T>>>[];

  lastEvaluatedKey?: string;
}

export interface IsConversationMemberInput {
  conversationId: ConversationId;
  userId: UserId;
}

export interface IsConversationMemberOutput {
  isConversationMember: boolean;
}

interface GetRecentMessagesInput {
  recentMessageIds: MessageId[];
}

interface GetRecentMessagesOutput {
  recentMessages: Message[];
}

interface GetToAndTypeFromConversationIdAndFromInput {
  from: UserId;
  conversationId: ConversationId;
}

interface GetToAndTypeFromConversationIdAndFromOutput {
  to: To;
  type: ConversationTypeEnum;
}

type ConversationUserRelationshipWithEntityId<T extends ConversationFetchType> = ConversationUserRelationship<ConversationFetchTypeToConversationType<T>> & { entityId: UserId | GroupId | MeetingId; }
;
