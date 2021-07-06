import { inject, injectable } from "inversify";
import { LoggerServiceInterface, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface, Conversation as ConversationEntity } from "../services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../services/conversationUserRelationship.service";
import { UserId } from "../types/userId.type";

@injectable()
export class ConversationMediatorService implements ConversationMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

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

export interface ConversationMediatorServiceInterface {
  getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
}

export type Conversation = ConversationEntity;

export interface GetConversationsByUserIdInput {
  userId: UserId;
  exclusiveStartKey?: string;
}

export interface GetConversationsByUserIdOutput {
  conversations: WithRole<Conversation>[];
  lastEvaluatedKey?: string;
}
