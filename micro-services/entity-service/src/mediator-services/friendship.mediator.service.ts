import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface } from "../services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../services/conversationUserRelationship.service";
@injectable()
export class FriendshipMediatorService implements FriendshipMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createFriendship(params: CreateFriendshipInput): Promise<CreateFriendshipOutput> {
    try {
      this.loggerService.trace("createFriendship called", { params }, this.constructor.name);

      const { members } = params;

      const { conversation } = await this.conversationService.createDmConversation({ members });

      await Promise.all(members.map((userId) => this.conversationUserRelationshipService.createConversationUserRelationship({
        userId,
        conversationId: conversation.id,
        role: Role.Admin,
      })));

      const friendship: Friendship = {
        conversationId: conversation.id,
        members,
        createdAt: conversation.createdAt,
        updatedAt: conversation.createdAt,
      };

      return { friendship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createFriendship", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface FriendshipMediatorServiceInterface {
  createFriendship(params: CreateFriendshipInput): Promise<CreateFriendshipOutput>;
}

export interface Friendship {
  conversationId: string;
  members: [string, string];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFriendshipInput {
  members: [string, string];
}

export interface CreateFriendshipOutput {
  friendship: Friendship;
}
