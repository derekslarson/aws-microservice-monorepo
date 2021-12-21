/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { UserId } from "@yac/util/src/types/userId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { FileOperation } from "@yac/util/src/enums/fileOperation.enum";
import { MessageId } from "@yac/util/src/types/messageId.type";
import { ConversationId } from "@yac/util/src/types/conversationId.type";
import { MessageMimeType } from "@yac/util/src/enums/message.mimeType.enum";
import { ConversationType } from "@yac/util/src/enums/conversationType.enum";
import { OneOnOneId } from "@yac/util/src/types/oneOnOneId.type";
import { MeetingId } from "@yac/util/src/types/meetingId.type";
import { MessageUploadTokenServiceInterface } from "@yac/util/src/services/messageUploadToken.service";
import { MessageFileRepositoryInterface } from "@yac/util/src/repositories/base.message.s3.repository";
import { RawMessage as RawMessageEntity, Message as MessageEntity, MessageRepositoryInterface, MessageUpdates } from "../../repositories/message.dynamo.repository";
import { TYPES } from "../../inversion-of-control/types";
import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";
import { SearchIndex } from "../../enums/searchIndex.enum";
import { UpdateMessageReactionAction } from "../../enums/updateMessageReactionAction.enum";
import { PendingMessage as PendingMessageEntity, PendingMessageRepositoryInterface, PendingMessageUpdates } from "../../repositories/pendingMessage.dynamo.repository";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { MembershipType } from "../../enums/membershipType.enum";
import { Group as GroupEntity, GroupServiceInterface } from "../tier-1/group.service";
import { User as UserEntity, UserServiceInterface } from "../tier-1/user.service";
import { Meeting as MeetingEntity, MeetingServiceInterface } from "../tier-1/meeting.service";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.MessageUploadTokenServiceInterface) private messageUploadTokenService: MessageUploadTokenServiceInterface,
    @inject(TYPES.RawMessageFileRepositoryInterface) private rawMessageFileRepository: MessageFileRepositoryInterface,
    @inject(TYPES.EnhancedMessageFileRepositoryInterface) private enhancedMessageFileRepository: MessageFileRepositoryInterface,
    @inject(TYPES.PendingMessageRepositoryInterface) private pendingMessageRepository: PendingMessageRepositoryInterface,
    @inject(TYPES.MessageRepositoryInterface) private messageRepository: MessageRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private messageSearchRepository: MessageSearchRepositoryInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
  ) {}

  public async createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput> {
    try {
      this.loggerService.trace("createPendingMessage called", { params }, this.constructor.name);

      const { conversationId, from, mimeType } = params;

      const messageId: MessageId = `${KeyPrefix.Message}${this.idService.generateId()}`;

      const pendingMessageEntity: PendingMessageEntity = {
        id: messageId,
        conversationId,
        from,
        mimeType,
        createdAt: new Date().toISOString(),
      };

      await this.pendingMessageRepository.createPendingMessage({ pendingMessage: pendingMessageEntity });

      const { pendingMessage } = await this.getPendingMessage({ messageId });

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in createPendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getPendingMessage(params: GetPendingMessageInput): Promise<GetPendingMessageOutput> {
    try {
      this.loggerService.trace("getPendingMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageRepository.getPendingMessage({ messageId });

      const { signedUrl } = this.rawMessageFileRepository.getSignedUrl({
        messageId,
        conversationId: pendingMessageEntity.conversationId,
        mimeType: pendingMessageEntity.mimeType,
        operation: FileOperation.Upload,
      });

      const { token: chunkedUploadToken } = await this.messageUploadTokenService.generateToken({
        conversationId: pendingMessageEntity.conversationId,
        messageId,
        mimeType: pendingMessageEntity.mimeType,
      });

      const pendingMessage = {
        ...pendingMessageEntity,
        uploadUrl: signedUrl,
        chunkedUploadToken,
      };

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updatePendingMessage(params: UpdatePendingMessageInput): Promise<UpdatePendingMessageOutput> {
    try {
      this.loggerService.trace("updatePendingMessage called", { params }, this.constructor.name);

      const { messageId, updates } = params;

      await this.pendingMessageRepository.updatePendingMessage({ messageId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updatePendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deletePendingMessage(params: DeletePendingMessageInput): Promise<DeletePendingMessageOutput> {
    try {
      this.loggerService.trace("deletePendingMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      await this.pendingMessageRepository.deletePendingMessage({ messageId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deletePendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async convertPendingToRegularMessage(params: ConvertPendingToRegularMessageInput): Promise<ConvertPendingToRegularMessageOutput> {
    try {
      this.loggerService.trace("convertPendingToRegularMessage called", { params }, this.constructor.name);

      const { messageId, transcript } = params;

      const { pendingMessage } = await this.pendingMessageRepository.getPendingMessage({ messageId });

      const [ { message } ] = await Promise.all([
        this.createMessage({ ...pendingMessage, transcript }),
        this.pendingMessageRepository.deletePendingMessage({ messageId }),
      ]);

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertPendingToRegularMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { messageId = `${KeyPrefix.Message}${this.idService.generateId()}`, conversationId, from, mimeType, transcript, replyTo, title } = params;

      const now = new Date().toISOString();

      const { memberships } = await this.membershipRepository.getMembershipsByEntityId({ entityId: conversationId });

      const seenAt: Record<string, string | null> = {};
      memberships.forEach((membership) => seenAt[membership.userId] = membership.userId === from ? now : null);

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

      await Promise.all<unknown>([
        this.messageRepository.createMessage({ message: messageEntity }),
        ...memberships.map(({ userId }) => this.membershipRepository.incrementUnreadMessages({ entityId: conversationId, userId })),
      ]);

      const { messages: [ message ] } = await this.convertMessageEntitiesToMessages({ messageEntities: [ messageEntity ] });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput> {
    try {
      this.loggerService.trace("updateMessage called", { params }, this.constructor.name);

      const { messageId, updates } = params;

      await this.messageRepository.updateMessage({ messageId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessageByUserId(params: UpdateMessageByUserIdInput): Promise<UpdateMessageByUserIdOutput> {
    try {
      this.loggerService.trace("updateMessageByUserId called", { params }, this.constructor.name);

      const { messageId, userId, updates: { seen, reactions } } = params;

      const updatePromises: Promise<unknown>[] = [];

      if (typeof seen === "boolean" && !!seen) {
        updatePromises.push(this.messageRepository.markMessageSeen({ messageId, userId }));
      }

      if (reactions) {
        updatePromises.push(...reactions.map(({ reaction, action }) => this.messageRepository.updateMessageReaction({
          userId,
          messageId,
          reaction,
          action,
        })));
      }

      await Promise.all(updatePromises);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessage(params: GetMessageInput): Promise<GetMessageOutput> {
    try {
      this.loggerService.trace("getMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      const { message: messageEntity } = await this.messageRepository.getMessage({ messageId });

      const { messages: [ message ] } = await this.convertMessageEntitiesToMessages({ messageEntities: [ messageEntity ] });

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

      const messageEntityMap: Record<string, MessageEntity> = {};
      messageEntities.forEach((messageEntity) => messageEntityMap[messageEntity.id] = messageEntity);

      const sortedMessageEntities = messageIds.map((messageId) => messageEntityMap[messageId]);

      const { messages } = await this.convertMessageEntitiesToMessages({ messageEntities: sortedMessageEntities });

      return { messages };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId<T extends ConversationId, U extends UserId>(params: GetMessagesByConversationIdInput<T, U>): Promise<GetMessagesByConversationIdOutput<T>> {
    try {
      this.loggerService.trace("getMessagesByEntityId called", { params }, this.constructor.name);

      const { conversationId, requestingUserId, newOnly, exclusiveStartKey, limit } = params;

      let userActiveAt: string | undefined;

      if (requestingUserId) {
        const { membership } = await this.membershipRepository.getMembership({ userId: requestingUserId, entityId: conversationId });

        userActiveAt = membership.activeAt;
      }

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageRepository.getMessagesByConversationId({ conversationId, minCreatedAt: newOnly ? userActiveAt : undefined, exclusiveStartKey, limit });

      const { messages } = await this.convertMessageEntitiesToMessages({ messageEntities });

      const messagesWithNew = messages.map((message) => ({
        ...message,
        ...(userActiveAt && { new: message.createdAt > userActiveAt }),
      }));

      return { messages: messagesWithNew as Message<T>[], lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByEntityId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesBySearchTerm(params: GetMessagesBySearchTermInput): Promise<GetMessagesBySearchTermOutput> {
    try {
      this.loggerService.trace("getMessagesBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, limit, exclusiveStartKey } = params;

      const conversationIds: ConversationId[] = [];

      if ("conversationId" in params) {
        conversationIds.push(params.conversationId);
      } else {
        const { memberships } = await this.membershipRepository.getMembershipsByUserId({ userId: params.userId });
        memberships.map((membership) => [ MembershipType.Group, MembershipType.Meeting, MembershipType.OneOnOne ].includes(membership.type) && conversationIds?.push(membership.entityId as ConversationId));
      }

      const { messages: messageEntities, lastEvaluatedKey } = await this.messageSearchRepository.getMessagesBySearchTerm({ searchTerm, conversationIds, limit, exclusiveStartKey });

      const searchMessageIds = messageEntities.map((message) => message.id);

      const { messages } = await this.getMessages({ messageIds: searchMessageIds });

      return { messages, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesBySearchTerm", { error, params }, this.constructor.name);

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

  private async convertMessageEntitiesToMessages(params: ConvertMessageEntitiesToMessagesInput): Promise<Promise<ConvertMessageEntitiesToMessagesOutput>> {
    try {
      this.loggerService.trace("convertMessageEntitiesToMessages called", { params }, this.constructor.name);

      const { messageEntities } = params;

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

        const { signedUrl: fetchUrl } = this.enhancedMessageFileRepository.getSignedUrl({
          messageId: restOfMessageEntity.id,
          conversationId: restOfMessageEntity.conversationId,
          mimeType: restOfMessageEntity.mimeType,
          operation: FileOperation.Get,
        });

        return {
          ...restOfMessageEntity,
          from: entityMap[from] as UserEntity,
          to: entityMap[to],
          type: conversationType,
          fetchUrl,
        };
      }));

      return { messages };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertMessageEntitiesToMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageServiceInterface {
  createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput>;
  getPendingMessage(params: GetPendingMessageInput): Promise<GetPendingMessageOutput>;
  updatePendingMessage(params: UpdatePendingMessageInput): Promise<UpdatePendingMessageOutput>;
  deletePendingMessage(params: DeletePendingMessageInput): Promise<DeletePendingMessageOutput>;
  convertPendingToRegularMessage(params: ConvertPendingToRegularMessageInput): Promise<ConvertPendingToRegularMessageOutput>
  createMessage(params: CreateMessageInput): Promise<CreateMessageOutput>;
  updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput>;
  updateMessageByUserId(params: UpdateMessageByUserIdInput): Promise<UpdateMessageByUserIdOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessages(params: GetMessagesInput): Promise<GetMessagesOutput>;
  getMessagesByConversationId<T extends ConversationId, U extends UserId>(params: GetMessagesByConversationIdInput<T, U>): Promise<GetMessagesByConversationIdOutput<T>>
  getMessagesBySearchTerm(params: GetMessagesBySearchTermInput): Promise<GetMessagesBySearchTermOutput>;
  indexMessageForSearch(params: IndexMessageForSearchInput): Promise<IndexMessageForSearchOutput>;
  deindexMessageForSearch(params: DeindexMessageForSearchInput): Promise<DeindexMessageForSearchOutput>;
}

export type Message<T extends ConversationId | void = void> = Omit<MessageEntity, "from"> & {
  type: ConversationType;
  to: T extends OneOnOneId ? UserEntity : T extends GroupId ? GroupEntity : T extends MeetingId ? MeetingEntity : UserEntity | GroupEntity | MeetingEntity;
  from: UserEntity;
  fetchUrl: string;
  new?: boolean;
};

export interface PendingMessage extends PendingMessageEntity {
  uploadUrl: string;
  chunkedUploadToken: string;
}

export interface CreatePendingMessageInput {
  conversationId: ConversationId;
  from: UserId;
  mimeType: MessageMimeType;
}

export interface CreatePendingMessageOutput {
  pendingMessage: PendingMessage;
}

export interface GetPendingMessageInput {
  messageId: MessageId;
}

export interface GetPendingMessageOutput {
  pendingMessage: PendingMessage;
}

export interface UpdatePendingMessageInput {
  messageId: MessageId;
  updates: PendingMessageUpdates;
}

export type UpdatePendingMessageOutput = void;

export interface DeletePendingMessageInput {
  messageId: MessageId;
}

export type DeletePendingMessageOutput = void;

export interface ConvertPendingToRegularMessageInput {
  messageId: MessageId;
  transcript: string;
}

export interface ConvertPendingToRegularMessageOutput {
  message: Message;
}

export interface CreateMessageInput {
  conversationId: ConversationId;
  from: UserId;
  mimeType: MessageMimeType;
  transcript: string;
  messageId?: MessageId;
  replyTo?: MessageId;
  title?: string;
}

export interface CreateMessageOutput {
  message: Message;
}
export interface UpdateMessageInput {
  messageId: MessageId;
  updates: MessageUpdates;
}

export type UpdateMessageOutput = void;

interface ReactionChange {
  reaction: string;
  action: UpdateMessageReactionAction;
}

export interface UpdateMessageByUserIdUpdates {
  seen?: true;
  reactions?: ReactionChange[];
}

export interface UpdateMessageByUserIdInput {
  userId: UserId;
  messageId: MessageId;
  updates: UpdateMessageByUserIdUpdates;
}

export type UpdateMessageByUserIdOutput = void;

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

interface BaseGetMessagesBySearchTermInput {
  searchTerm: string;
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetMessagesBySearchTermAndUserIdInput extends BaseGetMessagesBySearchTermInput {
  userId: UserId;
}

interface GetMessagesBySearchTermAndConversationIdInput extends BaseGetMessagesBySearchTermInput {
  conversationId: ConversationId;
}

export type GetMessagesBySearchTermInput = GetMessagesBySearchTermAndUserIdInput | GetMessagesBySearchTermAndConversationIdInput;

export interface GetMessagesBySearchTermOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface IndexMessageForSearchInput {
  message: RawMessageEntity;
}

export type IndexMessageForSearchOutput = void;

export interface DeindexMessageForSearchInput {
  messageId: MessageId;
}

export type DeindexMessageForSearchOutput = void;

type MessageSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getMessagesBySearchTerm" | "getMeetingsBySearchTerm">;

interface ConvertMessageEntitiesToMessagesInput {
  messageEntities: MessageEntity[];
}

interface ConvertMessageEntitiesToMessagesOutput {
  messages: Message[];
}

interface GetConversationTypeFromConversationIdInput {
  conversationId: ConversationId;
}

interface GetConversationTypeFromConversationIdOutput {
  conversationType: ConversationType;
}
