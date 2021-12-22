import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { UserId } from "@yac/util/src/types/userId.type";
import { EntityType } from "../enums/entityType.enum";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class OrganizationAdminMappingDynamoRepository extends BaseDynamoRepositoryV2<OrganizationAdminMapping> implements OrganizationAdminMappingRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: OrganizationAdminMappingRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.billing, loggerService);

    this.gsiOneIndexName = config.globalSecondaryIndexNames.one;
  }

  public async createOrganizationAdminMapping(params: CreateOrganizationAdminMappingInput): Promise<CreateOrganizationAdminMappingOutput> {
    try {
      this.loggerService.trace("createOrganizationAdminMapping called", { params }, this.constructor.name);

      const { organizationAdminMapping } = params;

      const skAndGsi1Pk: SkAndGsi1Pk = `${EntityType.OrganizationAdminMapping}-${organizationAdminMapping.userId}`;

      const organizationAdminMappingEntity: RawOrganizationAdminMapping = {
        entityType: EntityType.OrganizationAdminMapping,
        pk: organizationAdminMapping.organizationId,
        sk: skAndGsi1Pk,
        gsi1pk: skAndGsi1Pk,
        gsi1sk: organizationAdminMapping.organizationId,
        ...organizationAdminMapping,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: organizationAdminMappingEntity,
      }).promise();

      return { organizationAdminMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganizationAdminMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationAdminMapping(params: GetOrganizationAdminMappingInput): Promise<GetOrganizationAdminMappingOutput> {
    try {
      this.loggerService.trace("getOrganizationAdminMapping called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      const sk: SkAndGsi1Pk = `${EntityType.OrganizationAdminMapping}-${userId}`;

      const organizationAdminMapping = await this.get({ Key: { pk: organizationId, sk } }, "Organization Admin Mapping");

      return { organizationAdminMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationAdminMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationAdminMappingsByOrganizationId(params: GetOrganizationAdminMappingsByOrganizationIdInput): Promise<GetOrganizationAdminMappingsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOrganizationAdminMappingsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId } = params;

      const { Items: organizationAdminMappings } = await this.query({
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": organizationId,
          ":user": "user",
        },
      });

      return { organizationAdminMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationAdminMappingsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationAdminMappingsByUserId(params: GetOrganizationAdminMappingsByUserIdInput): Promise<GetOrganizationAdminMappingsByUserIdOutput> {
    try {
      this.loggerService.trace("getOrganizationAdminMappingsByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const gsi1Pk: SkAndGsi1Pk = `${EntityType.OrganizationAdminMapping}-${userId}`;

      const { Items: organizationAdminMappings } = await this.query({
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :organization)",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": gsi1Pk,
          ":organization": "organization",
        },
      });

      return { organizationAdminMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationAdminMappingsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOrganizationAdminMapping(params: UpdateOrganizationAdminMappingInput): Promise<UpdateOrganizationAdminMappingOutput> {
    try {
      this.loggerService.trace("updateOrganizationAdminMapping called", { params }, this.constructor.name);

      const { organizationId, userId, updates } = params;

      const sk: SkAndGsi1Pk = `${EntityType.OrganizationAdminMapping}-${userId}`;

      const organizationAdminMapping = await this.partialUpdate(organizationId, sk, updates);
      return { organizationAdminMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganizationAdminMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOrganizationAdminMapping(params: DeleteOrganizationAdminMappingInput): Promise<DeleteOrganizationAdminMappingOutput> {
    try {
      this.loggerService.trace("deleteOrganizationAdminMapping called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      const sk: SkAndGsi1Pk = `${EntityType.OrganizationAdminMapping}-${userId}`;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: organizationId, sk },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOrganizationAdminMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationAdminMappingRepositoryInterface {
  createOrganizationAdminMapping(params: CreateOrganizationAdminMappingInput): Promise<CreateOrganizationAdminMappingOutput>;
  getOrganizationAdminMapping(params: GetOrganizationAdminMappingInput): Promise<GetOrganizationAdminMappingOutput>;
  getOrganizationAdminMappingsByOrganizationId(params: GetOrganizationAdminMappingsByOrganizationIdInput): Promise<GetOrganizationAdminMappingsByOrganizationIdOutput>;
  getOrganizationAdminMappingsByUserId(params: GetOrganizationAdminMappingsByUserIdInput): Promise<GetOrganizationAdminMappingsByUserIdOutput>
  updateOrganizationAdminMapping(params: UpdateOrganizationAdminMappingInput): Promise<UpdateOrganizationAdminMappingOutput>;
  deleteOrganizationAdminMapping(params: DeleteOrganizationAdminMappingInput): Promise<DeleteOrganizationAdminMappingOutput>;
}

type OrganizationAdminMappingRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface OrganizationAdminMapping {
  organizationId: OrganizationId;
  userId: UserId;
}

type SkAndGsi1Pk = `${EntityType.OrganizationAdminMapping}-${UserId}`;

export interface RawOrganizationAdminMapping extends OrganizationAdminMapping {
  entityType: EntityType.OrganizationAdminMapping;
  // organizationId
  pk: string;
  // ${EntityType.OrganizationAdminMapping}-${UserId}
  sk: SkAndGsi1Pk;
  // ${EntityType.OrganizationAdminMapping}-${UserId}
  gsi1pk: SkAndGsi1Pk;
  // organizationId
  gsi1sk: string;
}

export interface CreateOrganizationAdminMappingInput {
  organizationAdminMapping: OrganizationAdminMapping;
}

export interface CreateOrganizationAdminMappingOutput {
  organizationAdminMapping: OrganizationAdminMapping;
}

export type OrganizationAdminMappingUpdates = Partial<Omit<OrganizationAdminMapping, "organizationId" | "customerId">>;

export interface UpdateOrganizationAdminMappingInput {
  organizationId: OrganizationId;
  userId: UserId;
  updates: OrganizationAdminMappingUpdates;
}

export interface UpdateOrganizationAdminMappingOutput {
  organizationAdminMapping: OrganizationAdminMapping;
}

export interface GetOrganizationAdminMappingInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export interface GetOrganizationAdminMappingOutput {
  organizationAdminMapping: OrganizationAdminMapping;
}

export interface GetOrganizationAdminMappingsByOrganizationIdInput {
  organizationId: OrganizationId;
}

export interface GetOrganizationAdminMappingsByOrganizationIdOutput {
  organizationAdminMappings: OrganizationAdminMapping[];
}

export interface GetOrganizationAdminMappingsByUserIdInput {
  userId: UserId;
}

export interface GetOrganizationAdminMappingsByUserIdOutput {
  organizationAdminMappings: OrganizationAdminMapping[];
}

export interface DeleteOrganizationAdminMappingInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export type DeleteOrganizationAdminMappingOutput = void;
