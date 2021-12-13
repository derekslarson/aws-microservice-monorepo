/* eslint-disable import/no-cycle */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";

@injectable()
export class OneOnOneMembershipDynamoRepository extends BaseDynamoRepositoryV2<OneOnOneMembership> implements OneOnOneMembershipRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: OneOnOneMembershipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createOneOnOneMembership(params: CreateOneOnOneMembershipInput): Promise<CreateOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("createOneOnOneMembership called", { params }, this.constructor.name);

      const { oneOnOneMembership } = params;

      const oneOnOneMembershipEntity: RawOneOnOneMembership = {
        entityType: EntityType.OneOnOneMembership,
        pk: oneOnOneMembership.userId,
        sk: oneOnOneMembership.otherUserId,
        gsi1pk: oneOnOneMembership.userId,
        gsi1sk: `${KeyPrefix.OneOnOne}${KeyPrefix.Active}${oneOnOneMembership.activeAt}`,
        ...oneOnOneMembership,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: oneOnOneMembershipEntity,
      }).promise();

      return { oneOnOneMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOneMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOneMembership(params: GetOneOnOneMembershipInput): Promise<GetOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("getOneOnOneMembership called", { params }, this.constructor.name);

      const { userId, otherUserId } = params;

      const oneOnOneMembership = await this.get({ Key: { pk: userId, sk: otherUserId } }, "One On One Membership");

      return { oneOnOneMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOneMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOneOnOneMembership(params: UpdateOneOnOneMembershipInput): Promise<UpdateOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("updateOneOnOneMembership called", { params }, this.constructor.name);

      const { userId, otherUserId, updates } = params;

      const rawUpdates: RawOneOnOneMembershipUpdates = { ...updates };

      if (updates.activeAt) {
        rawUpdates.gsi1sk = `${KeyPrefix.OneOnOne}${KeyPrefix.Active}${updates.activeAt}`;
      }

      const oneOnOneMembership = await this.partialUpdate(userId, otherUserId, rawUpdates);

      return { oneOnOneMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOneOnOneMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOneOnOneMembership(params: DeleteOneOnOneMembershipInput): Promise<DeleteOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("deleteOneOnOneMembership called", { params }, this.constructor.name);

      const { userId, otherUserId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: otherUserId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOneOnOneMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOneMembershipsByUserId(params: GetOneOnOneMembershipsByUserIdInput): Promise<GetOneOnOneMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOneMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { Items: oneOnOneMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :userId AND begins_with(#gsi1sk, :oneOnOneActive)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":oneOnOneActive": `${KeyPrefix.OneOnOne}${KeyPrefix.Active}`,
        },
      });

      return {
        oneOnOneMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOneMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneMembershipRepositoryInterface {
  createOneOnOneMembership(params: CreateOneOnOneMembershipInput): Promise<CreateOneOnOneMembershipOutput>;
  getOneOnOneMembership(params: GetOneOnOneMembershipInput): Promise<GetOneOnOneMembershipOutput>;
  updateOneOnOneMembership(params: UpdateOneOnOneMembershipInput): Promise<UpdateOneOnOneMembershipOutput>;
  deleteOneOnOneMembership(params: DeleteOneOnOneMembershipInput): Promise<DeleteOneOnOneMembershipOutput>;
  getOneOnOneMembershipsByUserId(params: GetOneOnOneMembershipsByUserIdInput): Promise<GetOneOnOneMembershipsByUserIdOutput>;
}

type OneOnOneMembershipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface OneOnOneMembership {
  userId: UserId;
  otherUserId: UserId;
  createdAt: string;
  activeAt: string;
}
export interface RawOneOnOneMembership extends OneOnOneMembership {
  entityType: EntityType.OneOnOneMembership,
  pk: UserId;
  // otherUserId
  sk: UserId;
  gsi1pk: UserId;
  gsi1sk: Gsi1Sk;
}

export interface CreateOneOnOneMembershipInput {
  oneOnOneMembership: OneOnOneMembership;
}

export interface CreateOneOnOneMembershipOutput {
  oneOnOneMembership: OneOnOneMembership;
}

export interface GetOneOnOneMembershipInput {
  userId: UserId;
  otherUserId: UserId;
}

export interface GetOneOnOneMembershipOutput {
  oneOnOneMembership: OneOnOneMembership;
}

export type OneOnOneMembershipUpdates = Partial<Pick<OneOnOneMembership, "activeAt">>;

export interface UpdateOneOnOneMembershipInput {
  userId: UserId;
  otherUserId: UserId;
  updates: OneOnOneMembershipUpdates;
}

export interface UpdateOneOnOneMembershipOutput {
  oneOnOneMembership: OneOnOneMembership;
}

export interface DeleteOneOnOneMembershipInput {
  userId: UserId;
  otherUserId: UserId;
}

export type DeleteOneOnOneMembershipOutput = void;

export interface GetOneOnOneMembershipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOneMembershipsByUserIdOutput {
  oneOnOneMemberships: OneOnOneMembership[];
  lastEvaluatedKey?: string;
}

type RawOneOnOneMembershipUpdates = OneOnOneMembershipUpdates & { gsi1sk?: Gsi1Sk; };

type Gsi1Sk = `${KeyPrefix.OneOnOne}${KeyPrefix.Active}${string}`;
