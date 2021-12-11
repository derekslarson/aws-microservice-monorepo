import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { OrganizationId } from "./organization.dynamo.repository.v2";
import { TeamId } from "./team.dynamo.repository.v2";

@injectable()
export class GroupDynamoRepository extends BaseDynamoRepositoryV2<Group> implements GroupRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: GroupRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createGroup(params: CreateGroupInput): Promise<CreateGroupOutput> {
    try {
      this.loggerService.trace("createGroup called", { params }, this.constructor.name);

      const { group } = params;

      const groupEntity: RawGroup = {
        entityType: EntityTypeV2.Group,
        pk: group.id,
        sk: EntityTypeV2.Group,
        gsi1pk: group.teamId || group.organizationId,
        gsi1sk: `${KeyPrefixV2.Group}${KeyPrefixV2.Active}${group.activeAt}`,
        ...group,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: groupEntity,
      }).promise();

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

      const group = await this.get({ Key: { pk: groupId, sk: EntityTypeV2.Group } }, "Group");

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

      const group = await this.partialUpdate(groupId, EntityTypeV2.Group, updates);

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

      const groups = await this.batchGet({ Keys: groupIds.map((groupId) => ({ pk: groupId, sk: EntityTypeV2.Group })) });

      return { groups };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroups", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getGroupsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { groups, lastEvaluatedKey } = await this.getGroupsByTeamIdOrOrganizationId({ teamIdOrOrganizationId: organizationId, exclusiveStartKey, limit });

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { groups, lastEvaluatedKey } = await this.getGroupsByTeamIdOrOrganizationId({ teamIdOrOrganizationId: teamId, exclusiveStartKey, limit });

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public convertRawGroupToGroup(params: ConvertRawGroupToGroupInput): ConvertRawGroupToGroupOutput {
    try {
      this.loggerService.trace("convertRawGroupToGroup called", { params }, this.constructor.name);

      const { rawGroup } = params;

      const group = this.cleanse(rawGroup);

      return { group };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertRawGroupToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getGroupsByTeamIdOrOrganizationId(params: GetGroupsByTeamIdOrOrganizationIdInput): Promise<GetGroupsByTeamIdOrOrganizationIdOutput> {
    try {
      this.loggerService.trace("getGroupsByTeamIdOrOrganizationId called", { params }, this.constructor.name);

      const { teamIdOrOrganizationId, exclusiveStartKey, limit } = params;

      const { Items: groups, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :teamIdOrOrgId AND begins_with(#gsi1sk, :groupActive)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":teamIdOrOrgId": teamIdOrOrganizationId,
          ":groupActive": `${KeyPrefixV2.Group}${KeyPrefixV2.Active}`,
        },
      });

      return {
        groups,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamIdOrOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupRepositoryInterface {
  createGroup(params: CreateGroupInput): Promise<CreateGroupOutput>;
  getGroup(params: GetGroupInput): Promise<GetGroupOutput>;
  getGroups(params: GetGroupsInput): Promise<GetGroupsOutput>;
  getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByOrganizationIdOutput>;
  getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput>
  updateGroup(params: UpdateGroupInput): Promise<UpdateGroupOutput>;
  convertRawGroupToGroup(params: ConvertRawGroupToGroupInput): ConvertRawGroupToGroupOutput;
}

type GroupRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Group {
  id: GroupId;
  organizationId: OrganizationId;
  imageMimeType: ImageMimeType;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeAt: string;
  teamId?: TeamId;
}

export interface RawGroup extends Group {
  entityType: EntityTypeV2.Group,
  pk: GroupId;
  sk: EntityTypeV2.Group;
  gsi1pk: OrganizationId | TeamId;
  gsi1sk: `${KeyPrefixV2.Group}${KeyPrefixV2.Active}${string}`;
}

export interface CreateGroupInput {
  group: Group;
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

export interface GetGroupsByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByOrganizationIdOutput {
  groups: Group[];
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

export type GroupUpdates = Partial<Pick<Group, "name" | "imageMimeType">>;

export interface UpdateGroupInput {
  groupId: GroupId;
  updates: GroupUpdates;
}

export interface UpdateGroupOutput {
  group: Group;
}

export interface GetGroupsInput {
  groupIds: GroupId[];
}

export interface GetGroupsOutput {
  groups: Group[];
}

export interface ConvertRawGroupToGroupInput {
  rawGroup: RawGroup;

}

export interface ConvertRawGroupToGroupOutput {
  group: Group;
}

export type GroupId = `${KeyPrefixV2.Group}${string}`;

interface GetGroupsByTeamIdOrOrganizationIdInput {
  teamIdOrOrganizationId: TeamId | OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetGroupsByTeamIdOrOrganizationIdOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}
