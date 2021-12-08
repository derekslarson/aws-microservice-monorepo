import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, OrganizationId, Role } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { UserId } from "../types/userId.type";

@injectable()
export class OrganizationUserRelationshipDynamoRepository extends BaseDynamoRepositoryV2<OrganizationUserRelationship> implements OrganizationUserRelationshipRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: OrganizationUserRelationshipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createOrganizationUserRelationship(params: CreateOrganizationUserRelationshipInput): Promise<CreateOrganizationUserRelationshipOutput> {
    try {
      this.loggerService.trace("createOrganizationUserRelationship called", { params }, this.constructor.name);

      const { organizationUserRelationship } = params;

      const organizationUserRelationshipEntity: RawOrganizationUserRelationship = {
        entityType: EntityType.OrganizationUserRelationship,
        pk: organizationUserRelationship.organizationId,
        sk: organizationUserRelationship.userId,
        gsi1pk: organizationUserRelationship.userId,
        gsi1sk: organizationUserRelationship.organizationId,
        ...organizationUserRelationship,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: organizationUserRelationshipEntity,
      }).promise();

      return { organizationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganizationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationUserRelationship(params: GetOrganizationUserRelationshipInput): Promise<GetOrganizationUserRelationshipOutput> {
    try {
      this.loggerService.trace("getOrganizationUserRelationship called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      const organizationUserRelationship = await this.get({ Key: { pk: organizationId, sk: userId } }, "Organization-User Relationship");

      return { organizationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOrganizationUserRelationship(params: DeleteOrganizationUserRelationshipInput): Promise<DeleteOrganizationUserRelationshipOutput> {
    try {
      this.loggerService.trace("deleteOrganizationUserRelationship called", { params }, this.constructor.name);

      const { organizationId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: organizationId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOrganizationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationUserRelationshipsByOrganizationId(params: GetOrganizationUserRelationshipsByOrganizationIdInput): Promise<GetOrganizationUserRelationshipsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOrganizationUserRelationshipsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { Items: organizationUserRelationships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": organizationId,
          ":user": KeyPrefix.User,
        },
      });

      return {
        organizationUserRelationships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationUserRelationshipsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationUserRelationshipsByUserId(params: GetOrganizationUserRelationshipsByUserIdInput): Promise<GetOrganizationUserRelationshipsByUserIdOutput> {
    try {
      this.loggerService.trace("getOrganizationUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { Items: organizationUserRelationships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :organization)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": userId,
          ":organization": KeyPrefix.Organization,
        },
      });

      return {
        organizationUserRelationships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationUserRelationshipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationUserRelationshipRepositoryInterface {
  createOrganizationUserRelationship(params: CreateOrganizationUserRelationshipInput): Promise<CreateOrganizationUserRelationshipOutput>;
  getOrganizationUserRelationship(params: GetOrganizationUserRelationshipInput): Promise<GetOrganizationUserRelationshipOutput>;
  deleteOrganizationUserRelationship(params: DeleteOrganizationUserRelationshipInput): Promise<DeleteOrganizationUserRelationshipOutput>;
  getOrganizationUserRelationshipsByOrganizationId(params: GetOrganizationUserRelationshipsByOrganizationIdInput): Promise<GetOrganizationUserRelationshipsByOrganizationIdOutput>;
  getOrganizationUserRelationshipsByUserId(params: GetOrganizationUserRelationshipsByUserIdInput): Promise<GetOrganizationUserRelationshipsByUserIdOutput>;
}

type OrganizationUserRelationshipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface OrganizationUserRelationship {
  organizationId: OrganizationId;
  userId: UserId;
  role: Role;
}
export interface RawOrganizationUserRelationship extends OrganizationUserRelationship {
  entityType: EntityType.OrganizationUserRelationship,
  pk: OrganizationId;
  sk: UserId;
  gsi1pk: UserId;
  gsi1sk: OrganizationId;
}

export interface CreateOrganizationUserRelationshipInput {
  organizationUserRelationship: OrganizationUserRelationship;
}

export interface CreateOrganizationUserRelationshipOutput {
  organizationUserRelationship: OrganizationUserRelationship;
}

export interface GetOrganizationUserRelationshipInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export interface GetOrganizationUserRelationshipOutput {
  organizationUserRelationship: OrganizationUserRelationship;
}

export interface DeleteOrganizationUserRelationshipInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export type DeleteOrganizationUserRelationshipOutput = void;

export interface GetOrganizationUserRelationshipsByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationUserRelationshipsByOrganizationIdOutput {
  organizationUserRelationships: OrganizationUserRelationship[];
  lastEvaluatedKey?: string;
}

export interface GetOrganizationUserRelationshipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationUserRelationshipsByUserIdOutput {
  organizationUserRelationships: OrganizationUserRelationship[];
  lastEvaluatedKey?: string;
}
