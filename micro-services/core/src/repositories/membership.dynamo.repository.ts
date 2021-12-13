/* eslint-disable no-nested-ternary */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BadRequestError, BaseDynamoRepositoryV2, ConversationId, DocumentClientFactory, LoggerServiceInterface, OrganizationId, Role, TeamId, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MembershipType } from "../enums/membershipType.enum";

@injectable()
export class MembershipDynamoRepository extends BaseDynamoRepositoryV2<Membership> implements MembershipRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  private gsiThreeIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MembershipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
    this.gsiThreeIndexName = envConfig.globalSecondaryIndexNames.three;
  }

  public async createMembership(params: CreateMembershipInput): Promise<CreateMembershipOutput> {
    try {
      this.loggerService.trace("createMembership called", { params }, this.constructor.name);

      const { membership } = params;

      const membershipEntity: RawMembership = {
        entityType: EntityType.Membership,
        pk: membership.entityId,
        sk: membership.userId,
        gsi1pk: membership.userId,
        gsi1sk: `${KeyPrefix.Membership}${KeyPrefix.Active}${membership.activeAt}`,
        gsi2pk: membership.userId,
        gsi2sk: `${KeyPrefix.Membership}${membership.type}_${KeyPrefix.Active}${membership.activeAt}`,
        ...(membership.dueAt && { gsi3pk: membership.userId, gsi3sk: `${KeyPrefix.Membership}${KeyPrefix.Due}${membership.dueAt}` }),
        ...membership,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: membershipEntity,
      }).promise();

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembership(params: GetMembershipInput): Promise<GetMembershipOutput> {
    try {
      this.loggerService.trace("getMembership called", { params }, this.constructor.name);

      const { entityId, userId } = params;

      const membership = await this.get({ Key: { pk: entityId, sk: userId } }, "Membership");

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMembership(params: UpdateMembershipInput): Promise<UpdateMembershipOutput> {
    try {
      this.loggerService.trace("updateMembership called", { params }, this.constructor.name);

      const { userId, entityId, updates } = params;

      const rawUpdates: RawMembershipUpdates = { ...updates };

      if (updates.activeAt) {
        const { membership } = await this.getMembership({ entityId, userId });

        rawUpdates.gsi1sk = `${KeyPrefix.Membership}${KeyPrefix.Active}${updates.activeAt}`;
        rawUpdates.gsi2sk = `${KeyPrefix.Membership}${membership.type}_${KeyPrefix.Active}${updates.activeAt}`;
      }

      if (updates.dueAt) {
        rawUpdates.gsi3sk = `${KeyPrefix.Membership}${KeyPrefix.Due}${updates.dueAt}`;
      }

      const membership = await this.partialUpdate(userId, entityId, rawUpdates);

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteMembership(params: DeleteMembershipInput): Promise<DeleteMembershipOutput> {
    try {
      this.loggerService.trace("deleteMembership called", { params }, this.constructor.name);

      const { entityId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: entityId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembershipsByEntityId(params: GetMembershipsByEntityIdInput): Promise<GetMembershipsByEntityIdOutput> {
    try {
      this.loggerService.trace("getMembershipsByEntityId called", { params }, this.constructor.name);

      const { entityId, exclusiveStartKey, limit } = params;

      const { Items: memberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        KeyConditionExpression: "#pk = :entityId AND begins_with(#sk, :userIdPrefix)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":entityId": entityId,
          ":userIdPrefix": KeyPrefix.User,
        },
      });

      return {
        memberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembershipsByEntityId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembershipsByUserId(params: GetMembershipsByUserIdInput): Promise<GetMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, type, sortByDueAt, exclusiveStartKey, limit } = params;

      if (sortByDueAt && type && type !== MembershipType.Meeting) {
        throw new BadRequestError(`Cannot sort by dueAt and type ${type}`);
      }

      const { Items: memberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: sortByDueAt ? this.gsiThreeIndexName : type ? this.gsiTwoIndexName : this.gsiOneIndexName,
        KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#pk": sortByDueAt ? "gsi3pk" : type ? "gsi2pk" : "gsi1pk",
          "#sk": sortByDueAt ? "gsi3pk" : type ? "gsi2sk" : "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":skPrefix": `${KeyPrefix.Membership}${type ? `${type}_` : ""}${sortByDueAt ? KeyPrefix.Due : KeyPrefix.Active}`,
        },
      });

      return {
        memberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MembershipRepositoryInterface {
  createMembership(params: CreateMembershipInput): Promise<CreateMembershipOutput>;
  getMembership(params: GetMembershipInput): Promise<GetMembershipOutput>;
  updateMembership(params: UpdateMembershipInput): Promise<UpdateMembershipOutput>;
  deleteMembership(params: DeleteMembershipInput): Promise<DeleteMembershipOutput>;
  getMembershipsByEntityId(params: GetMembershipsByEntityIdInput): Promise<GetMembershipsByEntityIdOutput>;
  getMembershipsByUserId(params: GetMembershipsByUserIdInput): Promise<GetMembershipsByUserIdOutput>;
}

type MembershipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export type EntityId = OrganizationId | TeamId | ConversationId;

export interface Membership {
  entityId: EntityId;
  userId: UserId;
  type: MembershipType;
  role: Role;
  createdAt: string;
  activeAt: string;
  dueAt?: string;
}

type Gsi1Sk = `${KeyPrefix.Membership}${KeyPrefix.Active}${string}`;
type Gsi2Sk = `${KeyPrefix.Membership}${MembershipType}_${KeyPrefix.Active}${string}`;
type Gsi3Sk = `${KeyPrefix.Membership}${KeyPrefix.Due}${string}`;

export interface RawMembership extends Membership {
  entityType: EntityType.Membership,
  pk: EntityId;
  sk: UserId;
  gsi1pk: UserId;
  gsi1sk: Gsi1Sk;
  gsi2pk: UserId;
  gsi2sk: Gsi2Sk;
  gsi3pk?: UserId;
  gsi3sk?: Gsi3Sk;
}

export interface CreateMembershipInput {
  membership: Membership;
}

export interface CreateMembershipOutput {
  membership: Membership;
}

export interface GetMembershipInput {
  entityId: EntityId;
  userId: UserId;
}

export interface GetMembershipOutput {
  membership: Membership;
}

export type MembershipUpdates = Partial<Pick<Membership, "role" | "activeAt" | "dueAt">>;

export interface UpdateMembershipInput {
  userId: UserId;
  entityId: EntityId;
  updates: MembershipUpdates;
}

export interface UpdateMembershipOutput {
  membership: Membership;
}

export interface DeleteMembershipInput {
  entityId: EntityId;
  userId: UserId;
}

export type DeleteMembershipOutput = void;

export interface GetMembershipsByEntityIdInput {
  entityId: EntityId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMembershipsByEntityIdOutput {
  memberships: Membership[];
  lastEvaluatedKey?: string;
}

export interface GetMembershipsByUserIdInput {
  userId: UserId;
  type?: MembershipType;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMembershipsByUserIdOutput {
  memberships: Membership[];
  lastEvaluatedKey?: string;
}

type RawMembershipUpdates = MembershipUpdates & { gsi1sk?: Gsi1Sk; gsi2sk?: Gsi2Sk; gsi3sk?: Gsi3Sk; };
