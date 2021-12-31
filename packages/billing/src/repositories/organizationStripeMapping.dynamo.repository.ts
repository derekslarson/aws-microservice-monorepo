import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { BillingPlan } from "@yac/util/src/enums/billingPlan.enum";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class OrganizationStripeMappingDynamoRepository extends BaseDynamoRepositoryV2<OrganizationStripeMapping> implements OrganizationStripeMappingRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: OrganizationStripeMappingRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.billing, loggerService);

    this.gsiOneIndexName = config.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = config.globalSecondaryIndexNames.two;
  }

  public async createOrganizationStripeMapping(params: CreateOrganizationStripeMappingInput): Promise<CreateOrganizationStripeMappingOutput> {
    try {
      this.loggerService.trace("createOrganizationStripeMapping called", { params }, this.constructor.name);

      const { organizationStripeMapping } = params;

      const organizationStripeMappingEntity: Omit<RawOrganizationStripeMapping, "pk" | "sk" | "subscriptionItemQuantity"> = {
        entityType: EntityType.OrganizationStripeMapping,
        gsi1pk: organizationStripeMapping.customerId,
        gsi1sk: EntityType.OrganizationStripeMapping,
        gsi2pk: EntityType.OrganizationStripeMapping,
        ...organizationStripeMapping,
      };

      // We need to do this as an update, because there is a race condition between
      // the organization creation and the addition of the first member (which increments subscriptionQuantity on this item),
      // so using a put here could potentially overwrite the record created in the case that the addition event
      // gets handled before the creation event
      const updateResponse = await this.partialUpdate(organizationStripeMapping.organizationId, EntityType.OrganizationStripeMapping, organizationStripeMappingEntity);

      return { organizationStripeMapping: updateResponse };
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
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
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

  public async getOrganizationStripeMappingsWithPendingQuantityUpdates(): Promise<GetOrganizationStripeMappingsWithPendingQuantityUpdatesOutput> {
    try {
      this.loggerService.trace("getOrganizationStripeMappingsWithPendingQuantityUpdates called", {}, this.constructor.name);

      const { Items: organizationStripeMappings } = await this.query({
        IndexName: this.gsiTwoIndexName,
        KeyConditionExpression: "#gsi2pk = :gsi2pk",
        ExpressionAttributeNames: { "#gsi2pk": "gsi2pk" },
        ExpressionAttributeValues: { ":gsi2pk": EntityType.OrganizationStripeMapping },
      });

      return { organizationStripeMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationStripeMappingsWithPendingQuantityUpdates", { error }, this.constructor.name);

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

  public async incrementSubscriptionItemQuantity(params: IncrementSubscriptionItemQuantityInput): Promise<IncrementSubscriptionItemQuantityOutput> {
    try {
      this.loggerService.trace("incrementSubscriptionItemQuantity called", { params }, this.constructor.name);

      const { organizationId } = params;

      const organizationStripeMapping = await this.update({
        Key: { pk: organizationId, sk: EntityType.OrganizationStripeMapping },
        UpdateExpression: "ADD #subscriptionItemQuantity :one SET #gsi2sk = :pendingQuantityUpdate",
        ExpressionAttributeNames: {
          "#subscriptionItemQuantity": "subscriptionItemQuantity",
          "#gsi2sk": "gsi2sk",
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":pendingQuantityUpdate": "PENDING_QUANTITY_UPDATE",
        },
      });

      return { organizationStripeMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in incrementSubscriptionQuantity", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async decrementSubscriptionItemQuantity(params: DecrementSubscriptionItemQuantityInput): Promise<DecrementSubscriptionItemQuantityOutput> {
    try {
      this.loggerService.trace("decrementSubscriptionItemQuantity called", { params }, this.constructor.name);

      const { organizationId } = params;

      const organizationStripeMapping = await this.update({
        Key: { pk: organizationId, sk: EntityType.OrganizationStripeMapping },
        UpdateExpression: "ADD #subscriptionItemQuantity :negativeOne SET #gsi2sk = :pendingQuantityUpdate",
        ExpressionAttributeNames: {
          "#subscriptionItemQuantity": "subscriptionItemQuantity",
          "#gsi2sk": "gsi2sk",
        },
        ExpressionAttributeValues: {
          ":negativeOne": -1,
          ":pendingQuantityUpdate": "PENDING_QUANTITY_UPDATE",
        },
      });

      return { organizationStripeMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in decrementSubscriptionQuantity", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removePendingQuantityUpdateStatus(params: RemovePendingQuantityUpdateStatusInput): Promise<RemovePendingQuantityUpdateStatusOutput> {
    try {
      this.loggerService.trace("removePendingQuantityUpdateStatus called", { params }, this.constructor.name);

      const { organizationId } = params;

      const organizationStripeMapping = await this.update({
        Key: { pk: organizationId, sk: EntityType.OrganizationStripeMapping },
        UpdateExpression: "REMOVE #gsi2sk",
        ExpressionAttributeNames: { "#gsi2sk": "gsi2sk" },
      });

      return { organizationStripeMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in removePendingQuantityUpdateStatus", { error, params }, this.constructor.name);

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
  getOrganizationStripeMappingsWithPendingQuantityUpdates(): Promise<GetOrganizationStripeMappingsWithPendingQuantityUpdatesOutput>
  updateOrganizationStripeMapping(params: UpdateOrganizationStripeMappingInput): Promise<UpdateOrganizationStripeMappingOutput>;
  incrementSubscriptionItemQuantity(params: IncrementSubscriptionItemQuantityInput): Promise<IncrementSubscriptionItemQuantityOutput>;
  decrementSubscriptionItemQuantity(params: DecrementSubscriptionItemQuantityInput): Promise<DecrementSubscriptionItemQuantityOutput>;
  removePendingQuantityUpdateStatus(params: RemovePendingQuantityUpdateStatusInput): Promise<RemovePendingQuantityUpdateStatusOutput>
  deleteOrganizationStripeMapping(params: DeleteOrganizationStripeMappingInput): Promise<DeleteOrganizationStripeMappingOutput>;
}

type OrganizationStripeMappingRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface OrganizationStripeMapping {
  organizationId: OrganizationId;
  customerId: string;
  productId: string;
  subscriptionItemId: string;
  subscriptionItemQuantity: number;
  plan: BillingPlan;
}

export interface RawOrganizationStripeMapping extends OrganizationStripeMapping {
  entityType: EntityType.OrganizationStripeMapping;
  // organizationId
  pk: string;
  sk: EntityType.OrganizationStripeMapping;
  // customerId
  gsi1pk: string;
  gsi1sk: EntityType.OrganizationStripeMapping;
  // sparse index for fetching pending quantity updates during chron job
  gsi2pk: EntityType.OrganizationStripeMapping;
  gsi2sk?: "PENDING_QUANTITY_UPDATE";
}

export interface CreateOrganizationStripeMappingInput {
  organizationStripeMapping: Omit<OrganizationStripeMapping, "subscriptionItemQuantity">;
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

export interface IncrementSubscriptionItemQuantityInput {
  organizationId: string;
}

export interface IncrementSubscriptionItemQuantityOutput {
  organizationStripeMapping: OrganizationStripeMapping;
}

export interface DecrementSubscriptionItemQuantityInput {
  organizationId: string;
}

export interface DecrementSubscriptionItemQuantityOutput {
  organizationStripeMapping: OrganizationStripeMapping;
}

export interface RemovePendingQuantityUpdateStatusInput {
  organizationId: string;
}

export interface RemovePendingQuantityUpdateStatusOutput {
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

export interface GetOrganizationStripeMappingsWithPendingQuantityUpdatesOutput {
  organizationStripeMappings: OrganizationStripeMapping[];
}
