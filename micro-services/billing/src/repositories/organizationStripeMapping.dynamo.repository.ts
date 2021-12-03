import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, NotFoundError } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class OrganizationStripeMappingDynamoRepository extends BaseDynamoRepositoryV2<OrganizationStripeMapping> implements OrganizationStripeMappingRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: OrganizationStripeMappingRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.billing, loggerService);

    this.gsiOneIndexName = config.globalSecondaryIndexNames.one;
  }

  public async createOrganizationStripeMapping(params: CreateOrganizationStripeMappingInput): Promise<CreateOrganizationStripeMappingOutput> {
    try {
      this.loggerService.trace("createOrganizationStripeMapping called", { params }, this.constructor.name);

      const { organizationStripeMapping } = params;

      const organizationStripeMappingEntity: RawOrganizationStripeMapping = {
        entityType: EntityType.OrganizationStripeMapping,
        pk: organizationStripeMapping.organizationId,
        sk: EntityType.OrganizationStripeMapping,
        gsi1pk: organizationStripeMapping.customerId,
        gsi1sk: EntityType.OrganizationStripeMapping,
        ...organizationStripeMapping,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: organizationStripeMappingEntity,
      }).promise();

      return { organizationStripeMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganizationStripeMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationStripeMapping(params: GetOrganizationStripeMappingInput): Promise<GetOrganizationStripeMappingOutput> {
    try {
      this.loggerService.trace("getOrganizationStripeMapping called", { params }, this.constructor.name);

      const { organizationId } = params;

      const organizationStripeMapping = await this.get<OrganizationStripeMapping>({ Key: { pk: organizationId, sk: EntityType.OrganizationStripeMapping } }, "Google Credentials");

      return { organizationStripeMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationStripeMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationStripeMappingByCustomerId(params: GetOrganizationStripeMappingByCustomerIdInput): Promise<GetOrganizationStripeMappingByCustomerIdOutput> {
    try {
      this.loggerService.trace("getOrganizationStripeMappingByCustomerId called", { params }, this.constructor.name);

      const { customerId } = params;

      const { Items: [ organizationStripeMapping ] } = await this.query({
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": customerId,
          ":gsi1sk": EntityType.OrganizationStripeMapping,
        },
      });

      if (!organizationStripeMapping) {
        throw new NotFoundError("Organization Stripe Mapping not found.");
      }

      return { organizationStripeMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationStripeMappingByCustomerId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOrganizationStripeMapping(params: UpdateOrganizationStripeMappingInput): Promise<UpdateOrganizationStripeMappingOutput> {
    try {
      this.loggerService.trace("updateOrganizationStripeMapping called", { params }, this.constructor.name);

      const { organizationId, updates } = params;

      const organizationStripeMapping = await this.partialUpdate(organizationId, EntityType.OrganizationStripeMapping, updates);
      return { organizationStripeMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganizationStripeMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOrganizationStripeMapping(params: DeleteOrganizationStripeMappingInput): Promise<DeleteOrganizationStripeMappingOutput> {
    try {
      this.loggerService.trace("deleteOrganizationStripeMapping called", { params }, this.constructor.name);

      const { organizationId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: organizationId, sk: EntityType.OrganizationStripeMapping },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOrganizationStripeMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationStripeMappingRepositoryInterface {
  createOrganizationStripeMapping(params: CreateOrganizationStripeMappingInput): Promise<CreateOrganizationStripeMappingOutput>;
  getOrganizationStripeMapping(params: GetOrganizationStripeMappingInput): Promise<GetOrganizationStripeMappingOutput>;
  getOrganizationStripeMappingByCustomerId(params: GetOrganizationStripeMappingByCustomerIdInput): Promise<GetOrganizationStripeMappingByCustomerIdOutput>;
  updateOrganizationStripeMapping(params: UpdateOrganizationStripeMappingInput): Promise<UpdateOrganizationStripeMappingOutput>;
  deleteOrganizationStripeMapping(params: DeleteOrganizationStripeMappingInput): Promise<DeleteOrganizationStripeMappingOutput>;
}

type OrganizationStripeMappingRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface OrganizationStripeMapping {
  organizationId: string;
  customerId: string;
  planId: string;
}

export interface RawOrganizationStripeMapping extends OrganizationStripeMapping {
  entityType: EntityType.OrganizationStripeMapping;
  // organizationId
  pk: string;
  sk: EntityType.OrganizationStripeMapping;
  // customerId
  gsi1pk: string;
  gsi1sk: EntityType.OrganizationStripeMapping;
}

export interface CreateOrganizationStripeMappingInput {
  organizationStripeMapping: OrganizationStripeMapping;
}

export interface CreateOrganizationStripeMappingOutput {
  organizationStripeMapping: OrganizationStripeMapping;
}

export type OrganizationStripeMappingUpdates = Partial<Omit<OrganizationStripeMapping, "organizationId" | "customerId">>;

export interface UpdateOrganizationStripeMappingInput {
  organizationId: string;
  updates: OrganizationStripeMappingUpdates;
}

export interface UpdateOrganizationStripeMappingOutput {
  organizationStripeMapping: OrganizationStripeMapping;
}

export interface GetOrganizationStripeMappingInput {
  organizationId: string;
}

export interface GetOrganizationStripeMappingOutput {
  organizationStripeMapping: OrganizationStripeMapping;
}

export interface GetOrganizationStripeMappingByCustomerIdInput {
  customerId: string;
}

export interface GetOrganizationStripeMappingByCustomerIdOutput {
  organizationStripeMapping: OrganizationStripeMapping;
}

export interface DeleteOrganizationStripeMappingInput {
  organizationId: string;
}

export type DeleteOrganizationStripeMappingOutput = void;
