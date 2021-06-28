import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role, Conversation, ConversationUserRelationship } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationRepositoryInterface } from "../repositories/conversation.dynamo.repository";

@injectable()
export class ConversationService implements ConversationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationRepositoryInterface) private conversationRepository: ConversationRepositoryInterface,
  ) {
  }

  public async createDmConversation(userIdA: string, userIdB: string): Promise<Conversation> {
    try {
      this.loggerService.trace("createConversation called", { userIdA, userIdB }, this.constructor.name);

      const createdConversation = await this.conversationRepository.createDmConversation(userIdA, userIdB);

      return createdConversation;
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversation", { error, userIdA, userIdB }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToConversation(conversationId: string, userId: string, role: Role): Promise<void> {
    try {
      this.loggerService.trace("addUserToConversation called", { conversationId, userId, role }, this.constructor.name);

      await this.conversationRepository.addUserToConversation(conversationId, userId, role);
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToConversation", { error, conversationId, userId, role }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromConversation(conversationId: string, userId: string): Promise<void> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { conversationId, userId }, this.constructor.name);

      await this.conversationRepository.removeUserFromConversation(conversationId, userId);
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, conversationId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { userId }, this.constructor.name);

      const conversations = await this.conversationRepository.getConversationsByUserId(userId);

      return conversations;
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async isConversationMember(conversationId: string, userId: string): Promise<boolean> {
    try {
      this.loggerService.trace("isConversationMember called", { conversationId, userId }, this.constructor.name);

      await this.conversationRepository.getConversationUserRelationship(conversationId, userId);

      return true;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return false;
      }

      this.loggerService.error("Error in isConversationMember", { error, conversationId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async isConversationAdmin(conversationId: string, userId: string): Promise<boolean> {
    try {
      this.loggerService.trace("isConversationAdmin called", { conversationId, userId }, this.constructor.name);

      const relationship = await this.conversationRepository.getConversationUserRelationship(conversationId, userId);

      return relationship.role === Role.Admin;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return false;
      }

      this.loggerService.error("Error in isConversationAdmin", { error, conversationId, userId }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationServiceInterface {
  createDmConversation(userIdA: string, userIdB: string): Promise<Conversation>;
  addUserToConversation(conversationId: string, userId: string, role: Role): Promise<void>;
  removeUserFromConversation(conversationId: string, userId: string): Promise<void>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  isConversationMember(conversationId: string, userId: string): Promise<boolean>;
  isConversationAdmin(conversationId: string, userId: string): Promise<boolean>;
}
