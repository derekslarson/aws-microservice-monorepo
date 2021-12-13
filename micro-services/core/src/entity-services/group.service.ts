import { inject, injectable } from "inversify";
import { FileOperation, GroupId, IdServiceInterface, LoggerServiceInterface, OrganizationId, TeamId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { GroupRepositoryInterface, Group as GroupEntity, RawGroup as RawGroupEntity, GroupUpdates as RepositoryGroupUpdates } from "../repositories/group.dynamo.repository";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";
import { EntityType } from "../enums/entityType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";

@injectable()
export class GroupService implements GroupServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.GroupRepositoryInterface) private groupRepository: GroupRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private groupSearchRepository: GroupSearchRepositoryInterface,
  ) {}

  public async createGroup(params: CreateGroupInput): Promise<CreateGroupOutput> {
    try {
      this.loggerService.trace("createGroup called", { params }, this.constructor.name);

      const { name, organizationId, createdBy, teamId } = params;

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
        ...(teamId && { teamId }),
      };

      await Promise.all([
        this.groupRepository.createGroup({ group: groupEntity }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.Group, entityId: groupId, file: image, mimeType: imageMimeType }),
      ]);

      const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

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

      const { group: groupEntity } = await this.groupRepository.getGroup({ groupId });

      const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGroup(params: UpdateGroupInput): Promise<UpdateGroupOutput> {
    try {
      this.loggerService.trace("updateGroup called", { params }, this.constructor.name);

      const { groupId, updates } = params;

      const { group: groupEntity } = await this.groupRepository.updateGroup({ groupId, updates });

      const { entity: group } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Group, entity: groupEntity });

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroup", { error, params }, this.constructor.name);

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

  public async getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupRepository.getGroupsByTeamId({ teamId, exclusiveStartKey, limit });

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

      const { organizationId, exclusiveStartKey, limit } = params;

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupRepository.getGroupsByOrganizationId({ organizationId, exclusiveStartKey, limit });

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

  public async getGroupsBySearchTerm(params: GetGroupsBySearchTermInput): Promise<GetGroupsBySearchTermOutput> {
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
  getGroup(params: GetGroupInput): Promise<GetGroupOutput>;
  updateGroup(params: UpdateGroupInput): Promise<UpdateGroupOutput>;
  getGroups(params: GetGroupsInput): Promise<GetGroupsOutput>;
  getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput>;
  getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByOrganizationIdOutput>;
  getGroupImageUploadUrl(params: GetGroupImageUploadUrlInput): GetGroupImageUploadUrlOutput;
  indexGroupForSearch(params: IndexGroupForSearchInput): Promise<IndexGroupForSearchOutput>;
  deindexGroupForSearch(params: DeindexGroupForSearchInput): Promise<DeindexGroupForSearchOutput>;
  getGroupsBySearchTerm(params: GetGroupsBySearchTermInput): Promise<GetGroupsBySearchTermOutput>;

}

export type Group = Omit<GroupEntity, "imageMimeType"> & {
  image: string;
};

export interface CreateGroupInput {
  name: string;
  organizationId: OrganizationId;
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

export type GroupUpdates = RepositoryGroupUpdates;

export interface UpdateGroupInput {
  groupId: GroupId;
  updates: GroupUpdates;
}

export interface UpdateGroupOutput {
  group: Group
}

export interface GetGroupsInput {
  groupIds: GroupId[];
}

export interface GetGroupsOutput {
  groups: Group[];
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

export interface DeleteGroupInput {
  groupId: GroupId;
}

export type DeleteGroupOutput = void;

export interface IndexGroupForSearchInput {
  group: RawGroupEntity;
}

export type IndexGroupForSearchOutput = void;

export interface DeindexGroupForSearchInput {
  groupId: GroupId;
}

export type DeindexGroupForSearchOutput = void;

export interface GetGroupsBySearchTermInput {
  searchTerm: string;
  groupIds?: GroupId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsBySearchTermOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}

export interface GetGroupImageUploadUrlInput {
  groupId: GroupId;
  mimeType: ImageMimeType;
}

export interface GetGroupImageUploadUrlOutput {
  uploadUrl: string;
}

type GroupSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getGroupsBySearchTerm" | "getMeetingsBySearchTerm">;
