import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, Role } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { GroupId } from "./group.dynamo.repository";
import { MessageId } from "./message.dynamo.repository.v2";
import { UserId } from "./user.dynamo.repository.v2";

@injectable()
export class GroupMembershipDynamoRepository extends BaseDynamoRepositoryV2<GroupMembership> implements GroupMembershipRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: GroupMembershipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
  }

  public async createGroupMembership(params: CreateGroupMembershipInput): Promise<CreateGroupMembershipOutput> {
    try {
      this.loggerService.trace("createGroupMembership called", { params }, this.constructor.name);

      const { groupMembership } = params;

      const groupMembershipEntity: RawGroupMembership = {
        entityType: EntityTypeV2.GroupMembership,
        pk: groupMembership.userId,
        sk: groupMembership.groupId,
        gsi1pk: groupMembership.groupId,
        gsi1sk: `${KeyPrefixV2.User}${KeyPrefixV2.Active}${groupMembership.userActiveAt}`,
        gsi2pk: groupMembership.userId,
        gsi2sk: `${KeyPrefixV2.Group}${KeyPrefixV2.Active}${groupMembership.groupActiveAt}`,
        ...groupMembership,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: groupMembershipEntity,
      }).promise();

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

      const groupMembership = await this.get({ Key: { pk: userId, sk: groupId } }, "Group Membership");

      return { groupMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGroupMembership(params: UpdateGroupMembershipInput): Promise<UpdateGroupMembershipOutput> {
    try {
      this.loggerService.trace("updateGroupMembership called", { params }, this.constructor.name);

      const { userId, groupId, updates } = params;

      const rawUpdates: UpdateGroupMembershipRawUpdates = { ...updates };

      if (updates.userActiveAt) {
        rawUpdates.gsi1sk = `${KeyPrefixV2.User}${KeyPrefixV2.Active}${updates.userActiveAt}`;
      }

      if (updates.groupActiveAt) {
        rawUpdates.gsi2sk = `${KeyPrefixV2.Group}${KeyPrefixV2.Active}${updates.groupActiveAt}`;
      }

      const groupMembership = await this.partialUpdate(userId, groupId, rawUpdates);

      return { groupMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroupMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteGroupMembership(params: DeleteGroupMembershipInput): Promise<DeleteGroupMembershipOutput> {
    try {
      this.loggerService.trace("deleteGroupMembership called", { params }, this.constructor.name);

      const { groupId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: groupId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteGroupMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupMembershipsByGroupId(params: GetGroupMembershipsByGroupIdInput): Promise<GetGroupMembershipsByGroupIdOutput> {
    try {
      this.loggerService.trace("getGroupMembershipsByGroupId called", { params }, this.constructor.name);

      const { groupId, exclusiveStartKey, limit } = params;

      const { Items: groupMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :groupId AND begins_with(#gsi1sk, :userActive)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":groupId": groupId,
          ":userActive": `${KeyPrefixV2.User}${KeyPrefixV2.Active}`,
        },
      });

      return {
        groupMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupMembershipsByGroupId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupMembershipsByUserId(params: GetGroupMembershipsByUserIdInput): Promise<GetGroupMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getGroupMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { Items: groupMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiTwoIndexName,
        KeyConditionExpression: "#gsi2pk = :userId AND begins_with(#gsi2sk, :groupActive)",
        ExpressionAttributeNames: {
          "#gsi2pk": "gsi2pk",
          "#gsi2sk": "gsi2sk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":groupActive": `${KeyPrefixV2.Group}${KeyPrefixV2.Active}`,
        },
      });

      return {
        groupMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GroupMembershipRepositoryInterface {
  createGroupMembership(params: CreateGroupMembershipInput): Promise<CreateGroupMembershipOutput>;
  getGroupMembership(params: GetGroupMembershipInput): Promise<GetGroupMembershipOutput>;
  updateGroupMembership(params: UpdateGroupMembershipInput): Promise<UpdateGroupMembershipOutput>;
  deleteGroupMembership(params: DeleteGroupMembershipInput): Promise<DeleteGroupMembershipOutput>;
  getGroupMembershipsByGroupId(params: GetGroupMembershipsByGroupIdInput): Promise<GetGroupMembershipsByGroupIdOutput>;
  getGroupMembershipsByUserId(params: GetGroupMembershipsByUserIdInput): Promise<GetGroupMembershipsByUserIdOutput>;
}

type GroupMembershipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface GroupMembership {
  userId: UserId;
  groupId: GroupId;
  role: Role;
  createdAt: string;
  userActiveAt: string;
  groupActiveAt: string;
}

export interface RawGroupMembership extends GroupMembership {
  entityType: EntityTypeV2.GroupMembership,
  pk: UserId;
  sk: GroupId;
  gsi1pk: GroupId;
  gsi1sk: Gsi1Sk;
  gsi2pk: UserId;
  gsi2sk: Gsi2Sk;
}

export interface CreateGroupMembershipInput {
  groupMembership: GroupMembership;
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

export interface UpdateGroupMembershipInput {
  userId: UserId;
  groupId: GroupId;
  updates: UpdateGroupMembershipUpdates;
}

export interface UpdateGroupMembershipOutput {
  groupMembership: GroupMembership;
}

type UpdateGroupMembershipUpdates = Partial<Pick<GroupMembership, "role" | "userActiveAt" | "groupActiveAt">>;
type UpdateGroupMembershipRawUpdates = UpdateGroupMembershipUpdates & { gsi1sk?: Gsi1Sk; gsi2sk?: Gsi2Sk; };

type Gsi1Sk = `${KeyPrefixV2.User}${KeyPrefixV2.Active}${string}`;
type Gsi2Sk = `${KeyPrefixV2.Group}${KeyPrefixV2.Active}${string}`;
