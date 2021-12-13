import { inject, injectable } from "inversify";
import { LoggerServiceInterface, GroupId, NotFoundError, OrganizationId, Role, TeamId, UserId, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GroupServiceInterface, Group, GroupUpdates } from "../entity-services/group.service";
import { GroupMembership as GroupMembershipEntity, GroupMembershipServiceInterface } from "../entity-services/groupMembership.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";

@injectable()
export class GroupMediatorService implements GroupMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.GroupMembershipServiceInterface) private groupMembershipService: GroupMembershipServiceInterface,
  ) {}

  public async createGroup(params: CreateGroupInput): Promise<CreateGroupOutput> {
    try {
      this.loggerService.trace("createGroup called", { params }, this.constructor.name);

      const { name, createdBy, organizationId, teamId } = params;

      const { group } = await this.groupService.createGroup({
        name,
        createdBy,
        organizationId,
        teamId,
      });

      await this.groupMembershipService.createGroupMembership({ userId: createdBy, groupId: group.id, role: Role.Admin });

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGroup(params: UpdateGroupInput): Promise<UpdateGroupOutput> {
    try {
      this.loggerService.trace("updateGroup called", { params }, this.constructor.name);

      const { groupId, updates } = params;

      await this.groupService.updateGroup({ groupId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroup(params: GetGroupInput): Promise<GetGroupOutput> {
    try {
      this.loggerService.trace("getGroup called", { params }, this.constructor.name);

      const { groupId } = params;

      const { group } = await this.groupService.getGroup({ groupId });

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getGroupImageUploadUrl(params: GetGroupImageUploadUrlInput): GetGroupImageUploadUrlOutput {
    try {
      this.loggerService.trace("getGroupImageUploadUrl called", { params }, this.constructor.name);

      const { groupId, mimeType } = params;

      const { uploadUrl } = this.groupService.getGroupImageUploadUrl({ groupId, mimeType });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToGroup(params: AddUserToGroupInput): Promise<AddUserToGroupOutput> {
    try {
      this.loggerService.trace("addUserToGroup called", { params }, this.constructor.name);

      const { groupId, userId, role } = params;

      await this.groupMembershipService.createGroupMembership({ groupId, userId, role });

      const groupMembership: GroupMembership = {
        groupId,
        userId,
        role,
      };

      return { groupMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromGroup(params: RemoveUserFromGroupInput): Promise<RemoveUserFromGroupOutput> {
    try {
      this.loggerService.trace("removeUserFromGroup called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      await this.groupMembershipService.deleteGroupMembership({
        groupId,
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

      const { groupMemberships, lastEvaluatedKey } = await this.groupMembershipService.getGroupMembershipsByUserId({
        userId,
        exclusiveStartKey,
        limit,
      });

      const groupIds = groupMemberships.map((relationship) => relationship.groupId);

      const { groups } = await this.groupService.getGroups({ groupIds });

      const groupsWithRoles = groups.map((group, i) => ({
        ...group,
        role: groupMemberships[i].role,
      }));

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

      const { groups, lastEvaluatedKey } = await this.groupService.getGroupsByTeamId({
        teamId,
        exclusiveStartKey,
        limit,
      });

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getGroupsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { groups, lastEvaluatedKey } = await this.groupService.getGroupsByOrganizationId({
        organizationId,
        exclusiveStartKey,
        limit,
      });

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isGroupMember(params: IsGroupMemberInput): Promise<IsGroupMemberOutput> {
    try {
      this.loggerService.trace("isGroupMember called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      await this.groupMembershipService.getGroupMembership({
        groupId,
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

      const { groupMembership } = await this.groupMembershipService.getGroupMembership({
        groupId,
        userId,
      });

      return { isGroupAdmin: groupMembership.role === Role.Admin };
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
  updateGroup(params: UpdateGroupInput): Promise<UpdateGroupOutput>;
  getGroup(params: GetGroupInput): Promise<GetGroupOutput>
  addUserToGroup(params: AddUserToGroupInput): Promise<AddUserToGroupOutput>;
  removeUserFromGroup(params: RemoveUserFromGroupInput): Promise<RemoveUserFromGroupOutput>;
  getGroupImageUploadUrl(params: GetGroupImageUploadUrlInput): GetGroupImageUploadUrlOutput;
  getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput>;
  getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput>;
  getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByOrganizationIdOutput>;
  isGroupMember(params: IsGroupMemberInput): Promise<IsGroupMemberOutput>;
  isGroupAdmin(params: IsGroupAdminInput): Promise<IsGroupAdminOutput>;
}

export interface CreateGroupInput {
  name: string;
  createdBy: UserId;
  organizationId: OrganizationId;
  teamId?: TeamId;
}

export interface CreateGroupOutput {
  group: Group;
}

export interface UpdateGroupInput {
  groupId: GroupId;
  updates: GroupUpdates;
}

export type UpdateGroupOutput = void;

export interface GetGroupInput {
  groupId: GroupId;
}

export interface GetGroupOutput {
  group: Group;
}

export interface GetGroupImageUploadUrlInput {
  groupId: GroupId;
  mimeType: ImageMimeType;
}

export interface GetGroupImageUploadUrlOutput {
  uploadUrl: string;
}

export type GroupMembership = Pick<GroupMembershipEntity, "userId" | "groupId" | "role">;

export interface AddUserToGroupInput {
  groupId: GroupId;
  userId: UserId;
  role: Role;
}

export interface AddUserToGroupOutput {
  groupMembership: GroupMembership;
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

export interface GetGroupsByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByOrganizationIdOutput {
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
