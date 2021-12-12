import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, Role } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { UserId } from "./user.dynamo.repository.v2";

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
        entityType: EntityTypeV2.OneOnOneMembership,
        pk: oneOnOneMembership.userId,
        sk: oneOnOneMembership.otherUserId,
        gsi1pk: oneOnOneMembership.userId,
        gsi1sk: `${KeyPrefixV2.OneOnOne}${KeyPrefixV2.Active}${oneOnOneMembership.activeAt}`,
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
          ":oneOnOneActive": `${KeyPrefixV2.OneOnOne}${KeyPrefixV2.Active}`,
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
  entityType: EntityTypeV2.OneOnOneMembership,
  pk: UserId;
  sk: UserId;
  gsi1pk: UserId;
  gsi1sk: `${KeyPrefixV2.OneOnOne}${KeyPrefixV2.Active}${string}`;
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

export type OneOnOneId = `${UserId}_${UserId}`;
