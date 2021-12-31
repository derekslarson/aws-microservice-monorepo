/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { Role } from "@yac/util/src/enums/role.enum";
import { UserId } from "@yac/util/src/types/userId.type";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TeamId } from "@yac/util/src/types/teamId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { FileOperation } from "@yac/util/src/enums/fileOperation.enum";
import { RawGroup as RawGroupEntity, Group as GroupEntity, GroupRepositoryInterface, GroupUpdates } from "../../repositories/group.dynamo.repository";
import { GroupMembership as GroupMembershipEntity, MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { ImageFileRepositoryInterface } from "../../repositories/image.s3.repository";
import { TYPES } from "../../inversion-of-control/types";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MembershipType } from "../../enums/membershipType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";
import { MembershipFetchType } from "../../enums/membershipFetchType.enum";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { SearchIndex } from "../../enums/searchIndex.enum";

@injectable()
export class GroupService implements GroupServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.GroupRepositoryInterface) private groupRepository: GroupRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private groupSearchRepository: GroupSearchRepositoryInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async createGroup(params: CreateGroupInput): Promise<CreateGroupOutput> {
    try {
      this.loggerService.trace("createGroup called", { params }, this.constructor.name);

      const { name, createdBy, organizationId, teamId } = params;

      const groupId: GroupId = `${KeyPrefix.Group}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const now = new Date().toISOString();

      const groupEntity: GroupEntity = {
        imageMimeType,
        id: groupId,
        organizationId,
        name,
        createdBy,
        createdAt: now,
        updatedAt: now,
        activeAt: now,
        teamId,
      };

      await Promise.all([
        this.groupRepository.createGroup({ group: groupEntity }),
        this.addUserToGroup({ userId: createdBy, groupId, role: Role.Admin }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.Group, entityId: groupId, file: image, mimeType: imageMimeType }),
      ]);

      const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

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

      await this.groupRepository.updateGroup({ groupId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToGroup(params: AddUserToGroupInput): Promise<AddUserToGroupOutput> {
    try {
      this.loggerService.trace("addUserToGroup called", { params }, this.constructor.name);

      const { groupId, userId, role } = params;

      const now = new Date().toISOString();

      const membership: GroupMembership = {
        createdAt: now,
        activeAt: now,
        userActiveAt: now,
        unseenMessages: 0,
        userId,
        entityId: groupId,
        type: MembershipType.Group,
        role,
      };

      await this.membershipRepository.createMembership({ membership });

      return { groupMembership: membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromGroup(params: RemoveUserFromGroupInput): Promise<RemoveUserFromGroupOutput> {
    try {
      this.loggerService.trace("removeUserFromGroup called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      await this.membershipRepository.deleteMembership({ entityId: groupId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroup(params: GetGroupInput): Promise<GetGroupOutput> {
    try {
      this.loggerService.trace("getGroup called", { params }, this.constructor.name);

      const { groupId } = params;

      const { group: groupEntity } = await this.groupRepository.getGroup({ groupId });

      const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroups(params: GetGroupsInput): Promise<GetGroupsOutput> {
    try {
      this.loggerService.trace("getGroups called", { params }, this.constructor.name);

      const { groupIds } = params;

      const { groups } = await this.groupRepository.getGroups({ groupIds });

      const groupMap: Record<string, Group> = {};
      groups.forEach((groupEntity) => {
        const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

        groupMap[group.id] = group;
      });

      const sortedGroups = groupIds.map((groupId) => groupMap[groupId]);

      return { groups: sortedGroups };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroups", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getGroupsByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, exclusiveStartKey, limit } = params;

      if (searchTerm) {
        const { memberships } = await this.membershipRepository.getMembershipsByUserId({ userId, type: MembershipFetchType.Group });

        const groupIds = memberships.map((membership) => membership.entityId);

        const { groups: groupEntities, lastEvaluatedKey } = await this.getGroupsBySearchTerm({ groupIds, searchTerm, exclusiveStartKey, limit });

        const membershipMap: Record<string, GroupMembership> = {};
        memberships.forEach((membership) => membershipMap[membership.entityId] = membership);

        const groups = groupEntities.map((groupEntity) => ({
          ...groupEntity,
          role: membershipMap[groupEntity.id].role,
          activeAt: membershipMap[groupEntity.id].activeAt,
          lastViewedAt: membershipMap[groupEntity.id].userActiveAt,
          unseenMessages: membershipMap[groupEntity.id].unseenMessages,
        }));

        return { groups, lastEvaluatedKey };
      }

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.Group,
        exclusiveStartKey,
        limit,
      });

      const groupIds = memberships.map((membership) => membership.entityId);

      const { groups: groupEntities } = await this.getGroups({ groupIds });

      const groups = groupEntities.map((groupEntity, i) => ({
        ...groupEntity,
        role: memberships[i].role,
        activeAt: memberships[i].activeAt,
        lastViewedAt: memberships[i].userActiveAt,
        unseenMessages: memberships[i].unseenMessages,
      }));

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { params }, this.constructor.name);

      const { teamId, searchTerm, exclusiveStartKey, limit } = params;

      if (searchTerm) {
        const { groups, lastEvaluatedKey } = await this.getGroupsBySearchTerm({ teamId, searchTerm, exclusiveStartKey, limit });

        return { groups, lastEvaluatedKey };
      }

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupRepository.getGroupsByTeamId({
        teamId,
        exclusiveStartKey,
        limit,
      });

      const groups = groupEntities.map((groupEntity) => {
        const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

        return group;
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

      const { organizationId, searchTerm, exclusiveStartKey, limit } = params;

      if (searchTerm) {
        const { groups, lastEvaluatedKey } = await this.getGroupsBySearchTerm({ organizationId, searchTerm, exclusiveStartKey, limit });

        return { groups, lastEvaluatedKey };
      }

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupRepository.getGroupsByOrganizationId({
        organizationId,
        exclusiveStartKey,
        limit,
      });

      const groups = groupEntities.map((groupEntity) => {
        const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

        return group;
      });

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getGroupImageUploadUrl(params: GetGroupImageUploadUrlInput): GetGroupImageUploadUrlOutput {
    try {
      this.loggerService.trace("getGroupImageUploadUrl called", { params }, this.constructor.name);

      const { groupId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileRepository.getSignedUrl({
        operation: FileOperation.Upload,
        entityType: EntityType.Group,
        entityId: groupId,
        mimeType,
      });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isGroupMember(params: IsGroupMemberInput): Promise<IsGroupMemberOutput> {
    try {
      this.loggerService.trace("isGroupMember called", { params }, this.constructor.name);

      const { groupId, userId } = params;

      await this.membershipRepository.getMembership({ entityId: groupId, userId });

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

      const { membership } = await this.membershipRepository.getMembership({ entityId: groupId, userId });

      return { isGroupAdmin: membership.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isGroupAdmin: false };
      }
      this.loggerService.error("Error in isGroupAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexGroupForSearch(params: IndexGroupForSearchInput): Promise<IndexGroupForSearchOutput> {
    try {
      this.loggerService.trace("indexGroupForSearch called", { params }, this.constructor.name);

      const { group: rawGroup } = params;

      const { group } = this.groupRepository.convertRawGroupToGroup({ rawGroup });

      await this.groupSearchRepository.indexDocument({ index: SearchIndex.Group, document: group });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexGroupForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexGroupForSearch(params: DeindexGroupForSearchInput): Promise<DeindexGroupForSearchOutput> {
    try {
      this.loggerService.trace("deindexGroupForSearch called", { params }, this.constructor.name);

      const { groupId } = params;

      await this.groupSearchRepository.deindexDocument({ index: SearchIndex.Group, id: groupId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexGroupForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getGroupsBySearchTerm(params: GetGroupsBySearchTermInput): Promise<GetGroupsBySearchTermOutput> {
    try {
      this.loggerService.trace("getGroupsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, groupIds, limit, exclusiveStartKey } = params;

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupSearchRepository.getGroupsBySearchTerm({ searchTerm, groupIds, limit, exclusiveStartKey });

      const searchGroupIds = groupEntities.map((group) => group.id);

      const { groups } = await this.getGroups({ groupIds: searchGroupIds });

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupServiceInterface {
  createGroup(params: CreateGroupInput): Promise<CreateGroupOutput>;
  updateGroup(params: UpdateGroupInput): Promise<UpdateGroupOutput>;
  getGroup(params: GetGroupInput): Promise<GetGroupOutput>;
  getGroups(params: GetGroupsInput): Promise<GetGroupsOutput>;
  getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput>;
  getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput>;
  getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByOrganizationIdOutput>;
  getGroupImageUploadUrl(params: GetGroupImageUploadUrlInput): GetGroupImageUploadUrlOutput;
  addUserToGroup(params: AddUserToGroupInput): Promise<AddUserToGroupOutput>;
  removeUserFromGroup(params: RemoveUserFromGroupInput): Promise<RemoveUserFromGroupOutput>;
  isGroupMember(params: IsGroupMemberInput): Promise<IsGroupMemberOutput>;
  isGroupAdmin(params: IsGroupAdminInput): Promise<IsGroupAdminOutput>;
  indexGroupForSearch(params: IndexGroupForSearchInput): Promise<IndexGroupForSearchOutput>;
  deindexGroupForSearch(params: DeindexGroupForSearchInput): Promise<DeindexGroupForSearchOutput>;
}

export type Group = Omit<GroupEntity, "imageMimeType"> & {
  image: string;
};

export type GroupByUserId = Group & {
  role: Role;
  activeAt: string;
  lastViewedAt: string;
  unseenMessages: number;
};

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

export interface GetGroupsInput {
  groupIds: GroupId[];
}

export interface GetGroupsOutput {
  groups: Group[];
}

export interface GetGroupImageUploadUrlInput {
  groupId: GroupId;
  mimeType: ImageMimeType;
}

export interface GetGroupImageUploadUrlOutput {
  uploadUrl: string;
}

export type GroupMembership = GroupMembershipEntity;

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
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByUserIdOutput {
  groups: GroupByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByTeamIdInput {
  teamId: TeamId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByTeamIdOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByOrganizationIdInput {
  organizationId: OrganizationId;
  searchTerm?: string;
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

export interface IndexGroupForSearchInput {
  group: RawGroupEntity;
}

export type IndexGroupForSearchOutput = void;

export interface DeindexGroupForSearchInput {
  groupId: GroupId;
}

export type DeindexGroupForSearchOutput = void;

interface GetGroupsBySearchTermInput {
  searchTerm: string;
  teamId?: TeamId;
  organizationId?: OrganizationId;
  groupIds?: GroupId[];
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetGroupsBySearchTermOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}

type GroupSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getGroupsBySearchTerm">;
