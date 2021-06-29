import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationRepositoryInterface } from "../repositories/conversation.dynamo.repository";
import { Conversation } from "../models/conversation/conversation.model";
import { ConversationType } from "../enums/conversationType.enum";
import { ConversationUserRelationship } from "../models/conversation/conversation.user.relationship.model";
import { DmConversation } from "../models/conversation/dm.conversation.model";
import { ChannelConversation } from "../models/conversation/channel.conversation.model";
import { DmConversationCreationInput } from "../models/conversation/dm.conversation.creation.input.model";
import { ChannelConversationCreationInput } from "../models/conversation/channel.conversation.creation.input.model";

@injectable()
export class ConversationService implements ConversationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationRepositoryInterface) private conversationRepository: ConversationRepositoryInterface,
  ) {}

  public async createDmConversation(conversationCreationInput: DmConversationCreationInput): Promise<DmConversation> {
    try {
      this.loggerService.trace("createConversation called", { conversationCreationInput }, this.constructor.name);

      const conversation = await this.conversationRepository.createDmConversation(userIdA, userIdB);

      return conversation;
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversation", { error, conversationCreationInput }, this.constructor.name);

      throw error;
    }
  }

  public async createChannelConversation(conversationCreationInput: ChannelConversationCreationInput): Promise<ChannelConversation> {
    try {
      this.loggerService.trace("createConversation called", { conversationCreationInput }, this.constructor.name);

      const conversationBody: Omit<ChannelConversation, "id"> = {
        name,
        createdBy,
        conversationType: ConversationType.Channel,
      };

      const conversation = await this.conversationRepository.createChannelConversation(conversationBody);

      return conversation;
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversation", { error, conversationCreationInput }, this.constructor.name);

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

  public async updateConversationUserRelationship(conversationId: string, userId: string, update: Partial<ConversationUserRelationship>): Promise<void> {
    try {
      this.loggerService.trace("updateConversationUserRelationship called", { conversationId, userId, update }, this.constructor.name);

      await this.conversationRepository.updateConversationUserRelationship(conversationId, userId, update);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversationUserRelationship", { error, conversationId, userId, update }, this.constructor.name);

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

      const { conversations } = await this.conversationRepository.getConversationsByUserId(userId);

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
  createDmConversation(conversationCreationInput: DmConversationCreationInput): Promise<DmConversation>;
  createChannelConversation(conversationCreationInput: ChannelConversationCreationInput): Promise<ChannelConversation>;
  addUserToConversation(conversationId: string, userId: string, role: Role): Promise<void>;
  updateConversationUserRelationship(conversationId: string, userId: string, update: Partial<ConversationUserRelationship>): Promise<void>;
  removeUserFromConversation(conversationId: string, userId: string): Promise<void>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  isConversationMember(conversationId: string, userId: string): Promise<boolean>;
  isConversationAdmin(conversationId: string, userId: string): Promise<boolean>;
}
