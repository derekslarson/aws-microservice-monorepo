import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationUserRelationship } from "../models/conversation.user.relationship.model";
import { ConversationUserRelationshipRepositoryInterface } from "../repositories/conversationUserRelationship.dynamo.repository";

@injectable()
export class ConversationUserRelationshipService implements ConversationUserRelationshipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationUserRelationshipRepositoryInterface) private conversationUserRelationshipRepository: ConversationUserRelationshipRepositoryInterface,
  ) {}

  public async createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("createConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, role } = params;

      const conversationUserRelationship: ConversationUserRelationship = {
        conversationId,
        userId,
        role,
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

  public async getConversationUserRelationship(params: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipRepository.getConversationUserRelationship({ conversationId, userId });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUnreadMessageToConversationUserRelationship(params: AddUnreadMessageToConversationUserRelationshipInput): Promise<AddUnreadMessageToConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("addUnreadMessageToConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipRepository.addUnreadMessageToConversationUserRelationship({ conversationId, userId, messageId });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUnreadMessageToConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUnreadMessageFromConversationUserRelationship(params: RemoveUnreadMessageFromConversationUserRelationshipInput): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput> {
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

  public async updateConversationUserRelationshipUpdatedAt(params: UpdateConversationUserRelationshipUpdatedAtInput): Promise<UpdateConversationUserRelationshipUpdatedAtOutput> {
    try {
      this.loggerService.trace("updateConversationUserRelationshipUpdatedAt called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipRepository.updateConversationUserRelationshipUpdatedAt({ conversationId, userId });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversationUserRelationshipUpdatedAt", { error, params }, this.constructor.name);

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

  public async getConversationUserRelationshipsByConversationId(params: GetConversationUserRelationshipsByConversationIdInput): Promise<GetConversationUserRelationshipsByConversationIdOutput> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipRepository.getConversationUserRelationshipsByConversationId({ conversationId, exclusiveStartKey });

      return { conversationUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationshipsByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationshipsByUserId(params: GetConversationUserRelationshipsByUserIdInput): Promise<GetConversationUserRelationshipsByUserIdOutput> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipRepository.getConversationUserRelationshipsByUserId({ userId, exclusiveStartKey });

      return { conversationUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationshipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationUserRelationshipServiceInterface {
  createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput>;
  getConversationUserRelationship(params: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput>;
  addUnreadMessageToConversationUserRelationship(params: AddUnreadMessageToConversationUserRelationshipInput): Promise<AddUnreadMessageToConversationUserRelationshipOutput>;
  removeUnreadMessageFromConversationUserRelationship(params: RemoveUnreadMessageFromConversationUserRelationshipInput): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput>;
  updateConversationUserRelationshipUpdatedAt(params: UpdateConversationUserRelationshipUpdatedAtInput): Promise<UpdateConversationUserRelationshipUpdatedAtOutput>;
  deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput>;
  getConversationUserRelationshipsByConversationId(params: GetConversationUserRelationshipsByConversationIdInput): Promise<GetConversationUserRelationshipsByConversationIdOutput>;
  getConversationUserRelationshipsByUserId(params: GetConversationUserRelationshipsByUserIdInput): Promise<GetConversationUserRelationshipsByUserIdOutput>;
}

export interface CreateConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
  role: Role;
}

export interface CreateConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface GetConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
}

export interface GetConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface AddUnreadMessageToConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
  messageId: string;
}
export interface AddUnreadMessageToConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
  messageId: string;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface UpdateConversationUserRelationshipUpdatedAtInput {
  conversationId: string;
  userId: string;
}

export interface UpdateConversationUserRelationshipUpdatedAtOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface DeleteConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
}

export type DeleteConversationUserRelationshipOutput = void;

export interface GetConversationUserRelationshipsByConversationIdInput {
  conversationId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByConversationIdOutput {
  conversationUserRelationships: ConversationUserRelationship[];
  lastEvaluatedKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdOutput {
  conversationUserRelationships: ConversationUserRelationship[];
  lastEvaluatedKey?: string;
}
