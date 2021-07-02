import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationRepositoryInterface, Conversation as ConversationEntity } from "../repositories/conversation.dynamo.repository";
import { ConversationType } from "../enums/conversationType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";

@injectable()
export class ConversationService implements ConversationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ConversationRepositoryInterface) private conversationRepository: ConversationRepositoryInterface,
  ) {}

  public async createDmConversation(params: CreateDmConversationInput): Promise<CreateDmConversationOutput> {
    try {
      this.loggerService.trace("createDmConversation called", { params }, this.constructor.name);

      const { members, teamId } = params;

      const conversationId = `${KeyPrefix.DmConversation}${members.sort().join("-")}`;

      const conversation: DmConversation = {
        id: conversationId,
        type: ConversationType.DM,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await this.conversationRepository.createConversation({ conversation });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createDmConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createChannelConversation(params: CreateChannelConversationInput): Promise<CreateChannelConversationOutput> {
    try {
      this.loggerService.trace("createChannelConversation called", { params }, this.constructor.name);

      const { name, createdBy, teamId } = params;

      const conversationId = `${KeyPrefix.ChannelConversation}${this.idService.generateId()}`;

      const conversation: ChannelConversation = {
        id: conversationId,
        name,
        createdBy,
        type: ConversationType.Channel,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await this.conversationRepository.createConversation({ conversation });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createChannelConversation", { error, params }, this.constructor.name);

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

      const { teamId, exclusiveStartKey } = params;

      const { conversations, lastEvaluatedKey } = await this.conversationRepository.getConversationsByTeamId({ teamId, exclusiveStartKey });

      return { conversations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationServiceInterface {
  createDmConversation(params: CreateDmConversationInput): Promise<CreateDmConversationOutput>;
  createChannelConversation(params: CreateChannelConversationInput): Promise<CreateChannelConversationOutput>;
  getConversation(params: GetConversationInput): Promise<GetConversationOutput>;
  getConversations(params: GetConversationsInput): Promise<GetConversationsOutput>;
  getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput>;
}

export type Conversation = ConversationEntity;
export interface ChannelConversation extends ConversationEntity {
  type: ConversationType.Channel;
  createdBy: string;
  name: string;
}

export interface DmConversation extends ConversationEntity {
  type: ConversationType.DM;
}

export interface CreateDmConversationInput {
  members: [string, string];
  teamId?: string;
}

export interface CreateDmConversationOutput {
  conversation: DmConversation;
}

export interface CreateChannelConversationInput {
  name: string;
  createdBy: string;
  teamId?: string;
}

export interface CreateChannelConversationOutput {
  conversation: ChannelConversation;
}

export interface GetConversationInput {
  conversationId: string;
}

export interface GetConversationOutput {
  conversation: Conversation;
}

export interface GetConversationsInput {
  conversationIds: string[];
}

export interface GetConversationsOutput {
  conversations: Conversation[];
}

export interface GetConversationsByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput {
  conversations: Conversation[];
  lastEvaluatedKey?: string;
}
