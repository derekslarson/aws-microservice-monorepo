import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationRepositoryInterface, Conversation as ConversationEntity } from "../repositories/conversation.dynamo.repository";
import { ConversationType } from "../enums/conversationType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { FriendConvoId } from "../types/friendConvoId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { ConversationId } from "../types/conversationId.type";

@injectable()
export class ConversationService implements ConversationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ConversationRepositoryInterface) private conversationRepository: ConversationRepositoryInterface,
  ) {}

  public async createFriendConversation(params: CreateFriendConversationInput): Promise<CreateFriendConversationOutput> {
    try {
      this.loggerService.trace("createFriendConversation called", { params }, this.constructor.name);

      const { userIds, teamId } = params;

      const conversationId = `${KeyPrefix.FriendConversation}${userIds.sort().join("-")}` as FriendConvoId;

      const conversation: FriendConversation = {
        id: conversationId,
        type: ConversationType.Friend,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await this.conversationRepository.createConversation({ conversation });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createFriendConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getFriendConversationByUserIds(params: GetFriendConversationsByUserIdsInput): Promise<GetFriendConversationsByUserIdsOutput> {
    try {
      this.loggerService.trace("getFriendConversationByUserIds called", { params }, this.constructor.name);

      const { userIds } = params;

      const conversationId = `${KeyPrefix.FriendConversation}${userIds.sort().join("-")}` as FriendConvoId;

      const { conversation } = await this.conversationRepository.getConversation({ conversationId });

      return { conversation: conversation as FriendConversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in getFriendConversationByUserIds", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createGroupConversation(params: CreateGroupConversationInput): Promise<CreateGroupConversationOutput> {
    try {
      this.loggerService.trace("createGroupConversation called", { params }, this.constructor.name);

      const { name, createdBy, teamId } = params;

      const conversationId = `${KeyPrefix.GroupConversation}${this.idService.generateId()}` as GroupId;

      const conversation: GroupConversation = {
        id: conversationId,
        name,
        createdBy,
        type: ConversationType.Group,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await this.conversationRepository.createConversation({ conversation });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createMeetingConversation(params: CreateMeetingConversationInput): Promise<CreateMeetingConversationOutput> {
    try {
      this.loggerService.trace("createMeetingConversation called", { params }, this.constructor.name);

      const { name, createdBy, teamId, dueDate } = params;

      const conversationId = `${KeyPrefix.MeetingConversation}${this.idService.generateId()}` as MeetingId;

      const conversation: MeetingConversation = {
        id: conversationId,
        name,
        createdBy,
        dueDate,
        type: ConversationType.Meeting,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await this.conversationRepository.createConversation({ conversation });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversation(params: GetConversationInput): Promise<GetConversationOutput> {
    try {
      this.loggerService.trace("getConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      const { conversation } = await this.conversationRepository.getConversation({ conversationId });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteConversation(params: DeleteConversationInput): Promise<DeleteConversationOutput> {
    try {
      this.loggerService.trace("deleteConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      await this.conversationRepository.deleteConversation({ conversationId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversations(params: GetConversationsInput): Promise<GetConversationsOutput> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { conversationIds } = params;

      const { conversations } = await this.conversationRepository.getConversations({ conversationIds });

      const conversationMap = conversations.reduce((acc: { [key: string]: Conversation; }, conversation) => {
        acc[conversation.id] = conversation;

        return acc;
      }, {});

      const sortedConversations = conversationIds.map((conversationId) => conversationMap[conversationId]);

      return { conversations: sortedConversations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput> {
    try {
      this.loggerService.trace("getConversationsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { conversations, lastEvaluatedKey } = await this.conversationRepository.getConversationsByTeamId({ teamId, exclusiveStartKey, limit });

      return { conversations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationServiceInterface {
  createFriendConversation(params: CreateFriendConversationInput): Promise<CreateFriendConversationOutput>;
  getFriendConversationByUserIds(params: GetFriendConversationsByUserIdsInput): Promise<GetFriendConversationsByUserIdsOutput>;
  createGroupConversation(params: CreateGroupConversationInput): Promise<CreateGroupConversationOutput>;
  createMeetingConversation(params: CreateMeetingConversationInput): Promise<CreateMeetingConversationOutput>;
  getConversation(params: GetConversationInput): Promise<GetConversationOutput>;
  deleteConversation(params: DeleteConversationInput): Promise<DeleteConversationOutput>;
  getConversations(params: GetConversationsInput): Promise<GetConversationsOutput>;
  getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput>;
}

export type Conversation = ConversationEntity;

export interface FriendConversation extends ConversationEntity {
  id: FriendConvoId;
  type: ConversationType.Friend;
}
export interface GroupConversation extends ConversationEntity {
  id: GroupId;
  type: ConversationType.Group;
  createdBy: UserId;
  name: string;
}

export interface MeetingConversation extends Omit<GroupConversation, "type" | "id"> {
  id: MeetingId;
  type: ConversationType.Meeting;
  dueDate: string;
  outcomes?: string;
}

export interface CreateFriendConversationInput {
  userIds: [UserId, UserId];
  teamId?: TeamId;
}

export interface CreateFriendConversationOutput {
  conversation: FriendConversation;
}

export interface CreateGroupConversationInput {
  name: string;
  createdBy: UserId;
  teamId?: TeamId;
}

export interface CreateGroupConversationOutput {
  conversation: GroupConversation;
}

export interface CreateMeetingConversationInput {
  name: string;
  createdBy: UserId;
  dueDate: string;
  teamId?: TeamId;
}

export interface CreateMeetingConversationOutput {
  conversation: MeetingConversation;
}

export interface GetConversationInput {
  conversationId: ConversationId;
}

export interface GetConversationOutput {
  conversation: Conversation;
}

export interface GetConversationsInput {
  conversationIds: ConversationId[];
}

export interface GetConversationsOutput {
  conversations: Conversation[];
}

export interface GetConversationsByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput {
  conversations: Conversation[];
  lastEvaluatedKey?: string;
}

export interface GetFriendConversationsByUserIdsInput {
  userIds: [UserId, UserId];
}

export interface GetFriendConversationsByUserIdsOutput {
  conversation: FriendConversation;
}

export interface DeleteConversationInput {
  conversationId: ConversationId;
}

export type DeleteConversationOutput = void;
