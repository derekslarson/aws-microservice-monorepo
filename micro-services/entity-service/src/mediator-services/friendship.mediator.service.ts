import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface } from "../services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../services/conversationUserRelationship.service";
import { UserServiceInterface, User } from "../services/user.service";
@injectable()
export class FriendshipMediatorService implements FriendshipMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createFriendship(params: CreateFriendshipInput): Promise<CreateFriendshipOutput> {
    try {
      this.loggerService.trace("createFriendship called", { params }, this.constructor.name);

      const { members } = params;

      const { conversation } = await this.conversationService.createFriendConversation({ members });

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

  public async deleteFriendship(params: DeleteFriendshipInput): Promise<DeleteFriendshipOutput> {
    try {
      this.loggerService.trace("deleteFriendship called", { params }, this.constructor.name);

      const { members } = params;

      const { conversation } = await this.conversationService.getFriendConversationByMemberIds({ members });

      await Promise.all(members.map((userId) => this.conversationUserRelationshipService.deleteConversationUserRelationship({
        userId,
        conversationId: conversation.id,
      })));

      await this.conversationService.deleteConversation({ conversationId: conversation.id });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteFriendship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getFriendsByUserId(params: GetFriendsByUserIdInput): Promise<GetFriendsByUserIdOutput> {
    try {
      this.loggerService.trace("getFriendsByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({ userId });

      const userIds = conversationUserRelationships.map((relationship) => relationship.userId);

      const { users } = await this.userService.getUsers({ userIds });

      return { friends: users };
    } catch (error: unknown) {
      this.loggerService.error("Error in getFriendsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type Friend = User;

export interface FriendshipMediatorServiceInterface {
  createFriendship(params: CreateFriendshipInput): Promise<CreateFriendshipOutput>;
  deleteFriendship(params: DeleteFriendshipInput): Promise<DeleteFriendshipOutput>;
  getFriendsByUserId(params: GetFriendsByUserIdInput): Promise<GetFriendsByUserIdOutput>;
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

export interface DeleteFriendshipInput {
  members: [string, string];
}

export type DeleteFriendshipOutput = void;

export interface GetFriendsByUserIdInput {
  userId: string;
}

export interface GetFriendsByUserIdOutput {
  friends: Friend[];
}
