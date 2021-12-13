/* eslint-disable no-return-assign */
/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface, Conversation as ConversationEntity, Group, Meeting } from "../entity-services/group.service";
import { ConversationUserRelationshipServiceInterface, ConversationFetchTypeToConversationType, ConversationUserRelationship } from "../entity-services/groupMembership.service";
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
import { FriendConvoId } from "../types/friendConvoId.type";

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
      let relationshipsWithEntityIds: ConversationUserRelationshipWithEntityId<T>[] = conversationUserRelationships.map((relationship) => {
        let entityId: UserId | GroupId | MeetingId;

        if (relationship.type === ConversationTypeEnum.Friend) {
          const { userIds: conversationMemberIds } = this.conversationService.getUserIdsFromFriendConversationId({ conversationId: relationship.conversationId as FriendConvoId });
          ([ entityId ] = conversationMemberIds.filter((conversationMemberId) => conversationMemberId !== userId));
        } else {
          entityId = relationship.conversationId as GroupId | MeetingId;
        }

        return { ...relationship, entityId };
      });

      if (searchTerm) {
        // We need to create a map of the relationshipWithEntityIds array by their entityIds
        // so that we can recalculate them after the search query with O(1) time complexity
        const relationshipWithEntityIdsMap: Record<string, ConversationUserRelationshipWithEntityId<T>> = {};
        relationshipsWithEntityIds.forEach((relationship) => relationshipWithEntityIdsMap[relationship.entityId] = relationship);

        const entityIds = relationshipsWithEntityIds.map(({ entityId }) => entityId);

        const { usersGroupsAndMeetings, lastEvaluatedKey: searchLastEvaluatedKey } = await this.userGroupMeetingSearchService.getUsersGroupsAndMeetingsBySearchTerm({
          searchTerm,
          entityIds,
          limit,
          exclusiveStartKey,
        });

        lastEvaluatedKey = searchLastEvaluatedKey;

        // Since relationshipsWithEntityIds was initially set with every conversationId,
        // we need to recalculate it with the usersGroupsAndMeetings returned by the search service
        // so they are in the correct order and only contain the relevant ones
        relationshipsWithEntityIds = usersGroupsAndMeetings.map(({ id }) => relationshipWithEntityIdsMap[id]);
      }

      // We need to pull the ids for each of these entity types out of relationshipsWithEntityIds
      // so that we can fetch each type efficiently
      const friendIds: UserId[] = [];
      const conversationIds: (GroupId | MeetingId)[] = [];
      const recentMessageIds: MessageId[] = [];

      relationshipsWithEntityIds.forEach((relationship) => {
        if (relationship.type === ConversationTypeEnum.Friend) {
          friendIds.push(relationship.entityId as UserId);
        } else {
          conversationIds.push(relationship.entityId as GroupId | MeetingId);
        }

        if (relationship.recentMessageId) {
          recentMessageIds.push(relationship.recentMessageId);
        }
      });

      const [ { users: friends }, { conversations: groupsAndMeetings }, { recentMessages } ] = await Promise.all([
        this.userService.getUsers({ userIds: friendIds }),
        this.conversationService.getConversations({ conversationIds }),
        this.getRecentMessages({ recentMessageIds }),
      ]);

      // We need to create maps of each of the responses by their ids
      // so that we can fetch each one with O(1) time complexity
      // when generating the final conversation objects
      const entityMap: Record<string, User | Group | Meeting> = {};
      [ ...friends, ...groupsAndMeetings ].forEach((entity) => entityMap[entity.id] = entity);

      const recentMessageMap: Record<string, Message> = {};
      recentMessages.forEach((recentMessage) => recentMessageMap[recentMessage.to.id === userId ? recentMessage.from.id : recentMessage.to.id] = recentMessage);

      const conversations = relationshipsWithEntityIds.map(({ type: conversationType, entityId, unreadMessages, updatedAt, role }) => {
        const entity = entityMap[entityId];

        return {
          ...entity,
          updatedAt,
          role,
          type: conversationType,
          unreadMessages: unreadMessages?.length || 0,
          recentMessage: recentMessageMap[entityId],
        } as WithRole<Conversation<ConversationFetchTypeToConversationType<T>>>;
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

      const userIdSet = new Set<UserId>();
      const groupMeetingIdSet = new Set<GroupId | MeetingId>();

      const recentMessageEntitiesWithToEntityId = recentMessageEntities.map((message) => {
        userIdSet.add(message.from);

        if (message.conversationId.startsWith(KeyPrefix.FriendConversation)) {
          const { userIds: conversationMemberIds } = this.conversationService.getUserIdsFromFriendConversationId({ conversationId: message.conversationId as FriendConvoId });
          conversationMemberIds.forEach((userId) => userIdSet.add(userId));
          const [ toUserId ] = conversationMemberIds.filter((userId) => userId !== message.from);

          return { ...message, toEntityId: toUserId };
        }

        groupMeetingIdSet.add(message.conversationId as GroupId | MeetingId);

        return { ...message, toEntityId: message.conversationId };
      });

      const [ { users }, { conversations: groupsAndMeetings } ] = await Promise.all([
        this.userService.getUsers({ userIds: Array.from(userIdSet) }),
        this.conversationService.getConversations({ conversationIds: Array.from(groupMeetingIdSet) }),
      ]);

      const entityMap: Record<string, User | Group | Meeting> = {};
      [ ...users, ...groupsAndMeetings ].forEach((toEntity) => entityMap[toEntity.id] = toEntity);

      const recentMessages = recentMessageEntitiesWithToEntityId.map((message) => {
        const { conversationId, toEntityId, ...restOfMessage } = message;

        const to = entityMap[toEntityId];
        const from = entityMap[message.from] as User;

        return {
          ...restOfMessage,
          type: "type" in to ? to.type : ConversationTypeEnum.Friend,
          to,
          from,
        };
      });

      return { recentMessages };
    } catch (error: unknown) {
      this.loggerService.error("Error in getRecentMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }
}
export interface ConversationMediatorServiceInterface {
  getConversationsByUserId<T extends ConversationFetchType>(params: GetConversationsByUserIdInput<T>): Promise<GetConversationsByUserIdOutput<T>>;
  isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput>;
}

export interface Message extends Omit<MessageEntity, "conversationId" | "from"> {
  from: User;
  to: To;
  type: ConversationType;
}

export type Conversation<T extends ConversationType> = Omit<(T extends ConversationTypeEnum.Friend ? User : ConversationEntity<T>), "imageMimeType"> & {
  unreadMessages: number;
  image: string;
  updatedAt: string;
  type: T;
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
  conversations: WithRole<Conversation<ConversationFetchTypeToConversationType<T>>>[];
  lastEvaluatedKey?: string;
}

export interface IsConversationMemberInput {
  conversationId: ConversationId;
  userId: UserId;
}

export interface IsConversationMemberOutput {
  isConversationMember: boolean;
}

type To = User | Group | Meeting;

interface GetRecentMessagesInput {
  recentMessageIds: MessageId[];
}

interface GetRecentMessagesOutput {
  recentMessages: Message[];
}

type ConversationUserRelationshipWithEntityId<T extends ConversationFetchType> = ConversationUserRelationship<ConversationFetchTypeToConversationType<T>> & { entityId: UserId | GroupId | MeetingId; };
