import { inject, injectable } from "inversify";
import { LoggerServiceInterface, OrganizationId, Role, TeamId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface } from "../entity-services/group.service";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/groupMembership.service";
import { UserServiceInterface, User } from "../entity-services/user.service";
import { UserId } from "../types/userId.type";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { ConversationId } from "../types/conversationId.type";
import { ConversationType } from "../enums/conversationType.enum";
import { ConversationFetchType } from "../enums/conversationFetchType.enum";
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

      const { userIds, createdBy, organizationId, teamId } = params;

      const { conversation } = await this.conversationService.createFriendConversation({ userIds, createdBy, organizationId, teamId });

      await Promise.all(userIds.map((userId) => this.conversationUserRelationshipService.createConversationUserRelationship({
        type: ConversationType.Friend,
        userId,
        conversationId: conversation.id,
        role: Role.Admin,
      })));

      const friendship: Friendship = {
        userIds,
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

      const { userIds } = params;

      const conversationId = `${KeyPrefix.FriendConversation}${userIds.sort().join("-")}` as ConversationId;

      await Promise.all(userIds.map((userId) => this.conversationUserRelationshipService.deleteConversationUserRelationship({
        userId,
        conversationId,
      })));

      await this.conversationService.deleteConversation({ conversationId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteFriendship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getFriendsByUserId(params: GetFriendsByUserIdInput): Promise<GetFriendsByUserIdOutput> {
    try {
      this.loggerService.trace("getFriendsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({
        userId,
        type: ConversationFetchType.Friend,
        exclusiveStartKey,
        limit,
      });

      const friendIds = conversationUserRelationships.map((relationship) => relationship.conversationId.replace(KeyPrefix.FriendConversation, "").replace(userId, "").replace(/^-|-$/, "") as UserId);

      const { users: friends } = await this.userService.getUsers({ userIds: friendIds });
      
      return { friends, lastEvaluatedKey };
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
  userIds: [UserId, UserId];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFriendshipInput {
  userIds: [UserId, UserId];
  createdBy: UserId;
  organizationId?: OrganizationId;
  teamId?: TeamId;
}

export interface CreateFriendshipOutput {
  friendship: Friendship;
}

export interface DeleteFriendshipInput {
  userIds: [UserId, UserId];
}

export type DeleteFriendshipOutput = void;

export interface GetFriendsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetFriendsByUserIdOutput {
  friends: Friend[];
  lastEvaluatedKey?: string;
}
