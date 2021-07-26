import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { 
  Conversation as ConversationEntity, 
  FriendConversation as FriendConversationEntity, 
  GroupConversation as GroupConversationEntity, 
  MeetingConversation as MeetingConversationEntity,
  ConversationRepositoryInterface, 
  ConversationUpdates
} from "../repositories/conversation.dynamo.repository";
import { ConversationType } from "../types/conversationType.type";
import { ConversationType as ConversationTypeEnum } from "../enums/conversationType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { FriendConvoId } from "../types/friendConvoId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { ConversationId } from "../types/conversationId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";

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
        type: ConversationTypeEnum.Friend,
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

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in getFriendConversationByUserIds", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createGroupConversation(params: CreateGroupConversationInput): Promise<CreateGroupConversationOutput> {
    try {
      this.loggerService.trace("createGroupConversation called", { params }, this.constructor.name);

      const { imageMimeType, name, createdBy, teamId } = params;

      const conversationId = `${KeyPrefix.GroupConversation}${this.idService.generateId()}` as GroupId;

      const conversation: GroupConversation = {
        imageMimeType,
        id: conversationId,
        name,
        createdBy,
        type: ConversationTypeEnum.Group,
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

      const { imageMimeType, name, createdBy, teamId, dueDate } = params;

      const conversationId = `${KeyPrefix.MeetingConversation}${this.idService.generateId()}` as MeetingId;

      const conversation: MeetingConversation = {
        imageMimeType,
        id: conversationId,
        name,
        createdBy,
        dueDate,
        type: ConversationTypeEnum.Meeting,
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

  public async getConversation<T extends ConversationId>(params: GetConversationInput<T>): Promise<GetConversationOutput<T>> {
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

  public async updateConversation<T extends ConversationId>(params: UpdateConversationInput<T>): Promise<UpdateConversationOutput<T>> {
    try {
      this.loggerService.trace("updateConversation called", { params }, this.constructor.name);

      const { conversationId, updates } = params;

      const { conversation } = await this.conversationRepository.updateConversation({ conversationId, updates });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversation", { error, params }, this.constructor.name);

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

  public async getConversations<T extends ConversationId>(params: GetConversationsInput<T>): Promise<GetConversationsOutput<T>> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { conversationIds } = params;

      const { conversations } = await this.conversationRepository.getConversations({ conversationIds });

      const conversationMap = conversations.reduce((acc: { [key: string]: Conversation<ConversationType<T>>; }, conversation) => {
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

  public async getConversationsByTeamId<T extends ConversationType>(params: GetConversationsByTeamIdInput<T>): Promise<GetConversationsByTeamIdOutput<T>> {
    try {
      this.loggerService.trace("getConversationsByTeamId called", { params }, this.constructor.name);

      const { teamId, type, exclusiveStartKey, limit } = params;

      const { conversations, lastEvaluatedKey } = await this.conversationRepository.getConversationsByTeamId({ teamId, type, exclusiveStartKey, limit });

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
  getConversation<T extends ConversationId>(params: GetConversationInput<T>): Promise<GetConversationOutput<T>>;
  updateConversation<T extends ConversationId>(params: UpdateConversationInput<T>): Promise<UpdateConversationOutput<T>>;
  deleteConversation(params: DeleteConversationInput): Promise<DeleteConversationOutput>;
  getConversations<T extends ConversationId>(params: GetConversationsInput<T>): Promise<GetConversationsOutput<T>>;
  getConversationsByTeamId<T extends ConversationType>(params: GetConversationsByTeamIdInput<T>): Promise<GetConversationsByTeamIdOutput<T>>;
}


export type Conversation<T extends ConversationType = ConversationType> = ConversationEntity<T>

export type FriendConversation = FriendConversationEntity;
export type GroupConversation = GroupConversationEntity;
export type MeetingConversation = MeetingConversationEntity;


export interface CreateFriendConversationInput {
  userIds: [UserId, UserId];
  teamId?: TeamId;
}

export interface CreateFriendConversationOutput {
  conversation: FriendConversation;
}

export interface CreateGroupConversationInput {
  imageMimeType: ImageMimeType;
  name: string;
  createdBy: UserId;
  teamId?: TeamId;
}

export interface CreateGroupConversationOutput {
  conversation: GroupConversation;
}

export interface CreateMeetingConversationInput {
  imageMimeType: ImageMimeType;
  name: string;
  createdBy: UserId;
  dueDate: string;
  teamId?: TeamId;
}

export interface CreateMeetingConversationOutput {
  conversation: MeetingConversation;
}

export interface GetConversationInput<T extends ConversationId> {
  conversationId: T;
}

export interface GetConversationOutput<T extends ConversationId> {
  conversation: Conversation<ConversationType<T>>
}

export interface UpdateConversationInput<T extends ConversationId> {
  conversationId: T;
  updates: ConversationUpdates<ConversationType<T>>;
}

export interface UpdateConversationOutput<T extends ConversationId> {
  conversation: Conversation<ConversationType<T>>
}

export interface GetConversationsInput<T extends ConversationId> {
  conversationIds: T[];
}

export interface GetConversationsOutput<T extends ConversationId> {
  conversations: Conversation<ConversationType<T>>[];
}


export interface GetConversationsByTeamIdInput<T extends ConversationType>  {
  teamId: TeamId;
  type?: T;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput<T extends ConversationType> {
  conversations: Conversation<T>[];
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
