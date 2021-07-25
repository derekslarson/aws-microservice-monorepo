import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import {
  ConversationUserRelationshipRepositoryInterface,
  ConversationUserRelationship as ConversationUserRelationshipEntity,
  ConversationFetchTypeToConversationType as RepositoryConversationFetchTypeToConversationType,
} from "../repositories/conversationUserRelationship.dynamo.repository";
import { ConversationId } from "../types/conversationId.type";
import { UserId } from "../types/userId.type";
import { MessageId } from "../types/messageId.type";
import { ConversationType } from "../types/conversationType.type";
import { ConversationFetchType } from "../enums/conversationFetchType.enum";

@injectable()
export class ConversationUserRelationshipService implements ConversationUserRelationshipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationUserRelationshipRepositoryInterface) private conversationUserRelationshipRepository: ConversationUserRelationshipRepositoryInterface,
  ) {}

  public async createConversationUserRelationship<T extends ConversationType>(params: CreateConversationUserRelationshipInput<T>): Promise<CreateConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("createConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, type, role, dueDate } = params;

      const conversationUserRelationship: ConversationUserRelationshipEntity<T> = {
        type,
        conversationId,
        userId,
        role,
        dueDate,
        muted: false,
        updatedAt: new Date().toISOString(),
      };

      await this.conversationUserRelationshipRepository.createConversationUserRelationship({ conversationUserRelationship });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationship<T extends ConversationId>(params: GetConversationUserRelationshipInput<T>): Promise<GetConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("getConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipRepository.getConversationUserRelationship({ conversationId, userId });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addMessageToConversationUserRelationship<T extends ConversationId>(params: AddMessageToConversationUserRelationshipInput<T>): Promise<AddMessageToConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("addMessageToConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId, sender, updateUpdatedAt } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipRepository.addMessageToConversationUserRelationship({ conversationId, userId, messageId, sender, updateUpdatedAt });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUnreadMessageToConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUnreadMessageFromConversationUserRelationship<T extends ConversationId>(params: RemoveUnreadMessageFromConversationUserRelationshipInput<T>): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("removeUnreadMessageFromConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipRepository.removeUnreadMessageFromConversationUserRelationship({ conversationId, userId, messageId });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUnreadMessageFromConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      await this.conversationUserRelationshipRepository.deleteConversationUserRelationship({ conversationId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationshipsByConversationId<T extends ConversationId>(params: GetConversationUserRelationshipsByConversationIdInput<T>): Promise<GetConversationUserRelationshipsByConversationIdOutput<T>> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipRepository.getConversationUserRelationshipsByConversationId({ conversationId, exclusiveStartKey, limit });

      return { conversationUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationshipsByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationshipsByUserId<T extends ConversationFetchType>(params: GetConversationUserRelationshipsByUserIdInput<T>): Promise<GetConversationUserRelationshipsByUserIdOutput<T>> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, type, unread, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipRepository.getConversationUserRelationshipsByUserId({ userId, type, unread, exclusiveStartKey, limit });

      return { conversationUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationshipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationUserRelationshipServiceInterface {
  createConversationUserRelationship<T extends ConversationType>(params: CreateConversationUserRelationshipInput<T>): Promise<CreateConversationUserRelationshipOutput<T>>;
  getConversationUserRelationship<T extends ConversationId>(params: GetConversationUserRelationshipInput<T>): Promise<GetConversationUserRelationshipOutput<T>>;
  addMessageToConversationUserRelationship<T extends ConversationId>(params: AddMessageToConversationUserRelationshipInput<T>): Promise<AddMessageToConversationUserRelationshipOutput<T>>;
  removeUnreadMessageFromConversationUserRelationship<T extends ConversationId>(params: RemoveUnreadMessageFromConversationUserRelationshipInput<T>): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput<T>>;
  deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput>;
  getConversationUserRelationshipsByConversationId<T extends ConversationId>(params: GetConversationUserRelationshipsByConversationIdInput<T>): Promise<GetConversationUserRelationshipsByConversationIdOutput<T>>;
  getConversationUserRelationshipsByUserId<T extends ConversationFetchType>(params: GetConversationUserRelationshipsByUserIdInput<T>): Promise<GetConversationUserRelationshipsByUserIdOutput<T>>;
}

export type ConversationUserRelationship<T extends ConversationType> = ConversationUserRelationshipEntity<T>;

export interface CreateConversationUserRelationshipInput<T extends ConversationType> {
  type: T;
  conversationId: ConversationId<T>;
  userId: UserId;
  role: Role;
  dueDate?: string;
}

export interface CreateConversationUserRelationshipOutput<T extends ConversationType> {
  conversationUserRelationship: ConversationUserRelationship<T>;
}

export interface GetConversationUserRelationshipInput<T extends ConversationId> {
  conversationId: T;
  userId: UserId;
}

export interface GetConversationUserRelationshipOutput<T extends ConversationId> {
  conversationUserRelationship: ConversationUserRelationship<ConversationType<T>>;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipInput<T extends ConversationId> {
  conversationId: T;
  userId: UserId;
  messageId: MessageId;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipOutput<T extends ConversationId> {
  conversationUserRelationship: ConversationUserRelationship<ConversationType<T>>;
}

export interface DeleteConversationUserRelationshipInput {
  conversationId: ConversationId;
  userId: UserId;
}

export type DeleteConversationUserRelationshipOutput = void;

export interface GetConversationUserRelationshipsByConversationIdInput<T extends ConversationId> {
  conversationId: T;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByConversationIdOutput<T extends ConversationId> {
  conversationUserRelationships: ConversationUserRelationship<ConversationType<T>>[];
  lastEvaluatedKey?: string;
}
export type ConversationFetchTypeToConversationType<T extends ConversationFetchType> = RepositoryConversationFetchTypeToConversationType<T>;

export interface GetConversationUserRelationshipsByUserIdInput<T extends ConversationFetchType> {
  userId: UserId;
  unread?: boolean;
  type?: T;
  limit?: number;
  exclusiveStartKey?: string;
}
export interface GetConversationUserRelationshipsByUserIdOutput<T extends ConversationFetchType> {
  conversationUserRelationships: ConversationUserRelationship<ConversationFetchTypeToConversationType<T>>[];
  lastEvaluatedKey?: string;
}

export interface AddMessageToConversationUserRelationshipInput<T extends ConversationId> {
  conversationId: T;
  userId: UserId;
  messageId: MessageId;
  sender?: boolean;
  updateUpdatedAt?: boolean;
}

export interface AddMessageToConversationUserRelationshipOutput<T extends ConversationId> {
  conversationUserRelationship: ConversationUserRelationship<ConversationType<T>>;
}
