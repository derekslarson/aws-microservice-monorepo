import { inject, injectable } from "inversify";
import { LoggerServiceInterface, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationUserRelationship } from "../models/conversation.user.relationship.model";
import { User } from "../models/user.model";
import { UserServiceInterface } from "../services/user.service";
import { ConversationServiceInterface } from "../services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../services/conversationUserRelationship.service";
import { Conversation } from "../models/conversation.model";

@injectable()
export class ConversationUserMediatorService implements ConversationUserMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async getUsersByConversationId(params: GetUsersByConversationIdInput): Promise<GetUsersByConversationIdOutput> {
    try {
      this.loggerService.trace("getUsersByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId, exclusiveStartKey });

      const userIds = conversationUserRelationships.map((relationship) => relationship.userId);

      const { users } = await this.userService.getUsers({ userIds });

      const usersWithRoles = users.map((user, i) => ({ ...user, role: conversationUserRelationships[i].role }));

      return { users: usersWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({ userId, exclusiveStartKey });

      const conversationIds = conversationUserRelationships.map((relationship) => relationship.conversationId);

      const { conversations } = await this.conversationService.getConversations({ conversationIds });

      const conversationsWithRoles = conversations.map((conversation, i) => ({ ...conversation, role: conversationUserRelationships[i].role }));

      return { conversations: conversationsWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationUserMediatorServiceInterface {
  getUsersByConversationId(params: GetUsersByConversationIdInput): Promise<GetUsersByConversationIdOutput>;
  getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
}

export interface GetUsersByConversationIdInput {
  conversationId: string;
  exclusiveStartKey?: string;
}

export interface GetUsersByConversationIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

export interface GetConversationsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationsByUserIdOutput {
  conversations: WithRole<Conversation>[];
  lastEvaluatedKey?: string;
}
