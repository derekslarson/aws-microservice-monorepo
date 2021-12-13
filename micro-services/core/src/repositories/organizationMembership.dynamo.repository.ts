import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, OrganizationId, Role, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";

@injectable()
export class OrganizationMembershipDynamoRepository extends BaseDynamoRepositoryV2<OrganizationMembership> implements OrganizationMembershipRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: OrganizationMembershipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createOrganizationMembership(params: CreateOrganizationMembershipInput): Promise<CreateOrganizationMembershipOutput> {
    try {
      this.loggerService.trace("createOrganizationMembership called", { params }, this.constructor.name);

      const { organizationMembership } = params;

      const organizationMembershipEntity: RawOrganizationMembership = {
        entityType: EntityType.OrganizationMembership,
        pk: organizationMembership.userId,
        sk: organizationMembership.organizationId,
        gsi1pk: organizationMembership.organizationId,
        gsi1sk: organizationMembership.userId,
        ...organizationMembership,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: organizationMembershipEntity,
      }).promise();

      return { organizationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganizationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationMembership(params: GetOrganizationMembershipInput): Promise<GetOrganizationMembershipOutput> {
    try {
      this.loggerService.trace("getOrganizationMembership called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      const organizationMembership = await this.get({ Key: { pk: userId, sk: organizationId } }, "Organization Membership");

      return { organizationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOrganizationMembership(params: UpdateOrganizationMembershipInput): Promise<UpdateOrganizationMembershipOutput> {
    try {
      this.loggerService.trace("updateOrganizationMembership called", { params }, this.constructor.name);

      const { userId, organizationId, updates } = params;

      const organizationMembership = await this.partialUpdate(userId, organizationId, updates);

      return { organizationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganizationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOrganizationMembership(params: DeleteOrganizationMembershipInput): Promise<DeleteOrganizationMembershipOutput> {
    try {
      this.loggerService.trace("deleteOrganizationMembership called", { params }, this.constructor.name);

      const { organizationId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: organizationId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOrganizationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationMembershipsByOrganizationId(params: GetOrganizationMembershipsByOrganizationIdInput): Promise<GetOrganizationMembershipsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOrganizationMembershipsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { Items: organizationMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :organizationId AND begins_with(#gsi1sk, :userIdPrefix)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":organizationId": organizationId,
          ":userIdPrefix": KeyPrefix.User,
        },
      });

      return {
        organizationMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationMembershipsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationMembershipsByUserId(params: GetOrganizationMembershipsByUserIdInput): Promise<GetOrganizationMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getOrganizationMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { Items: organizationMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :organizationIdPrefix)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":organizationIdPrefix": KeyPrefix.Organization,
        },
      });

      return {
        organizationMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationMembershipRepositoryInterface {
  createOrganizationMembership(params: CreateOrganizationMembershipInput): Promise<CreateOrganizationMembershipOutput>;
  getOrganizationMembership(params: GetOrganizationMembershipInput): Promise<GetOrganizationMembershipOutput>;
  updateOrganizationMembership(params: UpdateOrganizationMembershipInput): Promise<UpdateOrganizationMembershipOutput>;
  deleteOrganizationMembership(params: DeleteOrganizationMembershipInput): Promise<DeleteOrganizationMembershipOutput>;
  getOrganizationMembershipsByOrganizationId(params: GetOrganizationMembershipsByOrganizationIdInput): Promise<GetOrganizationMembershipsByOrganizationIdOutput>;
  getOrganizationMembershipsByUserId(params: GetOrganizationMembershipsByUserIdInput): Promise<GetOrganizationMembershipsByUserIdOutput>;
}

type OrganizationMembershipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface OrganizationMembership {
  userId: UserId;
  organizationId: OrganizationId;
  role: Role;
  createdAt: string;
}
export interface RawOrganizationMembership extends OrganizationMembership {
  entityType: EntityType.OrganizationMembership,
  pk: UserId;
  sk: OrganizationId;
  gsi1pk: OrganizationId;
  gsi1sk: UserId;
}

export interface CreateOrganizationMembershipInput {
  organizationMembership: OrganizationMembership;
}

export interface CreateOrganizationMembershipOutput {
  organizationMembership: OrganizationMembership;
}

export interface GetOrganizationMembershipInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export interface GetOrganizationMembershipOutput {
  organizationMembership: OrganizationMembership;
}

export interface UpdateOrganizationMembershipInput {
  userId: UserId;
  organizationId: OrganizationId;
  updates: UpdateOrganizationMembershipUpdates;
}

export interface UpdateOrganizationMembershipOutput {
  organizationMembership: OrganizationMembership;
}

export interface DeleteOrganizationMembershipInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export type DeleteOrganizationMembershipOutput = void;

export interface GetOrganizationMembershipsByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationMembershipsByOrganizationIdOutput {
  organizationMemberships: OrganizationMembership[];
  lastEvaluatedKey?: string;
}

export interface GetOrganizationMembershipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationMembershipsByUserIdOutput {
  organizationMemberships: OrganizationMembership[];
  lastEvaluatedKey?: string;
}

type UpdateOrganizationMembershipUpdates = Partial<Pick<OrganizationMembership, "role">>;
