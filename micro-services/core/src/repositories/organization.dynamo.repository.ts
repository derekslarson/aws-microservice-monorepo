import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { UserId } from "@yac/util/src/types/userId.type";
import { BillingPlan } from "@yac/util/src/enums/billingPlan.enum";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class OrganizationDynamoRepository extends BaseDynamoRepositoryV2<Organization> implements OrganizationRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: OrganizationRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    try {
      this.loggerService.trace("createOrganization called", { params }, this.constructor.name);

      const { organization } = params;

      const organizationEntity: RawOrganization = {
        entityType: EntityType.Organization,
        pk: organization.id,
        sk: EntityType.Organization,
        ...organization,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: organizationEntity,
      }).promise();

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganization(params: GetOrganizationInput): Promise<GetOrganizationOutput> {
    try {
      this.loggerService.trace("getOrganization called", { params }, this.constructor.name);

      const { organizationId } = params;

      const organization = await this.get({ Key: { pk: organizationId, sk: EntityType.Organization } }, "Organization");

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOrganization(params: UpdateOrganizationInput): Promise<UpdateOrganizationOutput> {
    try {
      this.loggerService.trace("updateOrganization called", { params }, this.constructor.name);

      const { organizationId, updates } = params;

      const organization = await this.partialUpdate(organizationId, EntityType.Organization, updates);

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizations(params: GetOrganizationsInput): Promise<GetOrganizationsOutput> {
    try {
      this.loggerService.trace("getOrganizations called", { params }, this.constructor.name);

      const { organizationIds } = params;

      const organizations = await this.batchGet({ Keys: organizationIds.map((organizationId) => ({ pk: organizationId, sk: EntityType.Organization })) });

      return { organizations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public convertRawOrganizationToOrganization(params: ConvertRawOrganizationToOrganizationInput): ConvertRawOrganizationToOrganizationOutput {
    try {
      this.loggerService.trace("convertRawOrganizationToOrganization called", { params }, this.constructor.name);

      const { rawOrganization } = params;

      const organization = this.cleanse(rawOrganization);

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertRawOrganizationToOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationRepositoryInterface {
  createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput>;
  getOrganization(params: GetOrganizationInput): Promise<GetOrganizationOutput>;
  updateOrganization(params: UpdateOrganizationInput): Promise<UpdateOrganizationOutput>;
  getOrganizations(params: GetOrganizationsInput): Promise<GetOrganizationsOutput>;
  convertRawOrganizationToOrganization(params: ConvertRawOrganizationToOrganizationInput): ConvertRawOrganizationToOrganizationOutput;
}

type OrganizationRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface Organization {
  id: OrganizationId;
  imageMimeType: ImageMimeType;
  name: string;
  billingPlan: BillingPlan;
  createdBy: UserId;
  createdAt: string;
  updatedAt: string;
}

export interface RawOrganization extends Organization {
  entityType: EntityType.Organization,
  pk: OrganizationId;
  sk: EntityType.Organization;
}

export interface CreateOrganizationInput {
  organization: Organization;
}

export interface CreateOrganizationOutput {
  organization: Organization;
}

export interface GetOrganizationInput {
  organizationId: OrganizationId;
}

export interface GetOrganizationOutput {
  organization: Organization;
}

export type OrganizationUpdates = Partial<Pick<Organization, "name" | "imageMimeType" | "billingPlan">>;

export interface UpdateOrganizationInput {
  organizationId: OrganizationId;
  updates: OrganizationUpdates;
}

export interface UpdateOrganizationOutput {
  organization: Organization;
}

export interface GetOrganizationsInput {
  organizationIds: OrganizationId[];
}

export interface GetOrganizationsOutput {
  organizations: Organization[];
}

export interface ConvertRawOrganizationToOrganizationInput {
  rawOrganization: RawOrganization;

}

export interface ConvertRawOrganizationToOrganizationOutput {
  organization: Organization;
}
