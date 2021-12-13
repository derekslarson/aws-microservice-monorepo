import { inject, injectable } from "inversify";
import { GroupId, LoggerServiceInterface, Role, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GroupMembershipRepositoryInterface, GroupMembership as GroupMembershipEntity, GroupMembershipUpdates } from "../repositories/groupMembership.dynamo.repository";

@injectable()
export class GroupMembershipService implements GroupMembershipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupMembershipRepositoryInterface) private groupMembershipRepository: GroupMembershipRepositoryInterface,
  ) {}

  public async createGroupMembership(params: CreateGroupMembershipInput): Promise<CreateGroupMembershipOutput> {
    try {
      this.loggerService.trace("createGroupMembership called", { params }, this.constructor.name);

      const { groupId, userId, role } = params;

      const now = new Date().toISOString();

      const groupMembership: GroupMembershipEntity = {
        groupId,
        userId,
        role,
        createdAt: now,
        groupActiveAt: now,
      };

      await this.groupMembershipRepository.createGroupMembership({ groupMembership });

      return { groupMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupMembership(params: GetGroupMembershipInput): Promise<GetGroupMembershipOutput> {
    try {
      this.loggerService.trace("getGroupMembership called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      const { groupMembership } = await this.groupMembershipRepository.getGroupMembership({ groupId, userId });

      return { groupMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGroupMembership(params: UpdateGroupMembershipInput): Promise<UpdateGroupMembershipOutput> {
    try {
      this.loggerService.trace("updateGroupMembership called", { params }, this.constructor.name);

      const { groupId, userId, updates } = params;

      const { groupMembership } = await this.groupMembershipRepository.updateGroupMembership({ groupId, userId, updates });

      return { groupMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroupMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteGroupMembership(params: DeleteGroupMembershipInput): Promise<DeleteGroupMembershipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      await this.groupMembershipRepository.deleteGroupMembership({ groupId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupMembershipsByGroupId(params: GetGroupMembershipsByGroupIdInput): Promise<GetGroupMembershipsByGroupIdOutput> {
    try {
      this.loggerService.trace("getGroupMembershipsByGroupId called", { params }, this.constructor.name);

      const { groupId, exclusiveStartKey, limit } = params;

      const { groupMemberships, lastEvaluatedKey } = await this.groupMembershipRepository.getGroupMembershipsByGroupId({ groupId, exclusiveStartKey, limit });

      return { groupMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupMembershipsByGroupId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupMembershipsByUserId(params: GetGroupMembershipsByUserIdInput): Promise<GetGroupMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getGroupMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { groupMemberships, lastEvaluatedKey } = await this.groupMembershipRepository.getGroupMembershipsByUserId({ userId, exclusiveStartKey, limit });

      return { groupMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupMembershipServiceInterface {
  createGroupMembership(params: CreateGroupMembershipInput): Promise<CreateGroupMembershipOutput>;
  getGroupMembership(params: GetGroupMembershipInput): Promise<GetGroupMembershipOutput>;
  deleteGroupMembership(params: DeleteGroupMembershipInput): Promise<DeleteGroupMembershipOutput>;
  getGroupMembershipsByGroupId(params: GetGroupMembershipsByGroupIdInput): Promise<GetGroupMembershipsByGroupIdOutput>;
  getGroupMembershipsByUserId(params: GetGroupMembershipsByUserIdInput): Promise<GetGroupMembershipsByUserIdOutput>;
}

export type GroupMembership = GroupMembershipEntity;

export interface CreateGroupMembershipInput {
  groupId: GroupId;
  userId: UserId;
  role: Role;
}

export interface CreateGroupMembershipOutput {
  groupMembership: GroupMembership;
}

export interface GetGroupMembershipInput {
  groupId: GroupId;
  userId: UserId;
}

export interface GetGroupMembershipOutput {
  groupMembership: GroupMembership;
}

export interface UpdateGroupMembershipInput {
  groupId: GroupId;
  userId: UserId;
  updates: GroupMembershipUpdates;
}

export interface UpdateGroupMembershipOutput {
  groupMembership: GroupMembership;
}

export interface DeleteGroupMembershipInput {
  groupId: GroupId;
  userId: UserId;
}

export type DeleteGroupMembershipOutput = void;

export interface GetGroupMembershipsByGroupIdInput {
  groupId: GroupId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupMembershipsByGroupIdOutput {
  groupMemberships: GroupMembership[];
  lastEvaluatedKey?: string;
}
export interface GetGroupMembershipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}
export interface GetGroupMembershipsByUserIdOutput {
  groupMemberships: GroupMembership[];
  lastEvaluatedKey?: string;
}
