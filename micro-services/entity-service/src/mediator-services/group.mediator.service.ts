import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface, GroupConversation } from "../entity-services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { GroupId } from "../types/groupId.type";

@injectable()
export class GroupMediatorService implements GroupMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createGroup(params: CreateGroupInput): Promise<CreateGroupOutput> {
    try {
      this.loggerService.trace("createGroup called", { params }, this.constructor.name);

      const { name, createdBy, teamId } = params;

      const { conversation } = await this.conversationService.createGroupConversation({
        name,
        createdBy,
        teamId,
      });

      await this.conversationUserRelationshipService.createConversationUserRelationship({ userId: createdBy, conversationId: conversation.id, role: Role.Admin });

      const { type, ...restOfGroup } = conversation;

      const group: Group = restOfGroup;

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroup(params: GetGroupInput): Promise<GetGroupOutput> {
    try {
      this.loggerService.trace("getGroup called", { params }, this.constructor.name);

      const { groupId } = params;

      const { conversation } = await this.conversationService.getConversation({ conversationId: groupId });

      const { type, ...restOfGroup } = conversation as GroupConversation;

      const group: Group = restOfGroup;

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteGroup(params: DeleteGroupInput): Promise<DeleteGroupOutput> {
    try {
      this.loggerService.trace("deleteGroup called", { params }, this.constructor.name);

      const { groupId } = params;

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId: groupId });

      const userIds = conversationUserRelationships.map((relationship) => relationship.userId);

      await Promise.all(userIds.map((userId) => this.conversationUserRelationshipService.deleteConversationUserRelationship({ userId, conversationId: groupId })));

      await this.conversationService.deleteConversation({ conversationId: groupId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToGroup(params: AddUserToGroupInput): Promise<AddUserToGroupOutput> {
    try {
      this.loggerService.trace("addUserToGroup called", { params }, this.constructor.name);

      const { groupId, userId, role } = params;

      await this.conversationUserRelationshipService.createConversationUserRelationship({
        conversationId: groupId,
        userId,
        role,
      });

      const membership: Membership = {
        groupId,
        userId,
        role,
      };

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromGroup(params: RemoveUserFromGroupInput): Promise<RemoveUserFromGroupOutput> {
    try {
      this.loggerService.trace("removeUserFromGroup called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      await this.conversationUserRelationshipService.deleteConversationUserRelationship({
        conversationId: groupId,
        userId,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getGroupsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({
        userId,
        exclusiveStartKey,
        limit,
      });

      const conversationIds = conversationUserRelationships.map((relationship) => relationship.conversationId);

      const { conversations } = await this.conversationService.getConversations({ conversationIds });

      const groupsWithRoles: WithRole<Group>[] = (conversations as GroupConversation[]).map((group, i) => ({ ...group, role: conversationUserRelationships[i].role }));

      return { groups: groupsWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { conversations, lastEvaluatedKey } = await this.conversationService.getConversationsByTeamId({
        teamId,
        exclusiveStartKey,
        limit,
      });

      return { groups: conversations as GroupConversation[], lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isGroupMember(params: IsGroupMemberInput): Promise<IsGroupMemberOutput> {
    try {
      this.loggerService.trace("isGroupMember called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      await this.conversationUserRelationshipService.getConversationUserRelationship({
        conversationId: groupId,
        userId,
      });

      return { isGroupMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isGroupMember: false };
      }
      this.loggerService.error("Error in isGroupMember", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isGroupAdmin(params: IsGroupAdminInput): Promise<IsGroupAdminOutput> {
    try {
      this.loggerService.trace("isGroupAdmin called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipService.getConversationUserRelationship({
        conversationId: groupId,
        userId,
      });

      return { isGroupAdmin: conversationUserRelationship.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isGroupAdmin: false };
      }
      this.loggerService.error("Error in isGroupAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupMediatorServiceInterface {
  createGroup(params: CreateGroupInput): Promise<CreateGroupOutput>;
  getGroup(params: GetGroupInput): Promise<GetGroupOutput>
  deleteGroup(params: DeleteGroupInput): Promise<DeleteGroupOutput>;
  addUserToGroup(params: AddUserToGroupInput): Promise<AddUserToGroupOutput>;
  removeUserFromGroup(params: RemoveUserFromGroupInput): Promise<RemoveUserFromGroupOutput>;
  getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput>;
  getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput>;
  isGroupMember(params: IsGroupMemberInput): Promise<IsGroupMemberOutput>;
  isGroupAdmin(params: IsGroupAdminInput): Promise<IsGroupAdminOutput>;
}

export type Group = Omit<GroupConversation, "type">;
export interface Membership { groupId: string; userId: string; role: Role; }

export interface CreateGroupInput {
  name: string;
  createdBy: UserId;
  teamId?: TeamId;
}

export interface CreateGroupOutput {
  group: Group;
}

export interface GetGroupInput {
  groupId: GroupId;
}

export interface GetGroupOutput {
  group: Group;
}

export interface DeleteGroupInput {
  groupId: GroupId;
}

export type DeleteGroupOutput = void;

export interface AddUserToGroupInput {
  groupId: GroupId;
  userId: UserId;
  role: Role;
}

export interface AddUserToGroupOutput {
  membership: Membership;
}

export interface RemoveUserFromGroupInput {
  groupId: GroupId;
  userId: UserId;
}

export type RemoveUserFromGroupOutput = void;

export interface GetGroupsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByUserIdOutput {
  groups: WithRole<Group>[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByTeamIdOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}

export interface IsGroupMemberInput {
  groupId: GroupId;
  userId: UserId;
}

export interface IsGroupMemberOutput {
  isGroupMember: boolean;
}

export interface IsGroupAdminInput {
  groupId: GroupId;
  userId: UserId;
}

export interface IsGroupAdminOutput {
  isGroupAdmin: boolean;
}
