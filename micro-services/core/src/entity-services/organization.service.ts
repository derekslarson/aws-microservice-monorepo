import { inject, injectable } from "inversify";
import { BillingPlan, FileOperation, IdServiceInterface, LoggerServiceInterface, OrganizationId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { OrganizationRepositoryInterface, Organization as OrganizationEntity, OrganizationUpdates, RawOrganization } from "../repositories/organization.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";
import { EntityType } from "../enums/entityType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";

@injectable()
export class OrganizationService implements OrganizationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.OrganizationRepositoryInterface) private organizationRepository: OrganizationRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private organizationSearchRepository: OrganizationSearchRepositoryInterface,
  ) {}

  public async createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    try {
      this.loggerService.trace("createOrganization called", { params }, this.constructor.name);

      const { name, createdBy } = params;

      const organizationId: OrganizationId = `${KeyPrefix.Organization}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const now = new Date().toISOString();

      const organizationEntity: OrganizationEntity = {
        id: organizationId,
        createdBy,
        imageMimeType,
        name,
        billingPlan: BillingPlan.Free,
        createdAt: now,
        updatedAt: now,
      };

      await Promise.all([
        this.imageFileRepository.uploadFile({ entityType: EntityType.Organization, entityId: organizationId, file: image, mimeType: imageMimeType }),
        this.organizationRepository.createOrganization({ organization: organizationEntity }),
      ]);

      const { entity: organization } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Organization, entity: organizationEntity });

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

      const { organization: organizationEntity } = await this.organizationRepository.getOrganization({ organizationId });

      const { entity: organization } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Organization, entity: organizationEntity });

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

      const { organization: organizationEntity } = await this.organizationRepository.updateOrganization({ organizationId, updates });

      const { entity: organization } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Organization, entity: organizationEntity });

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizations(params: GetOrganizationsInput): Promise<GetOrganizationsOutput> {
    try {
      this.loggerService.trace("getOrganization called", { params }, this.constructor.name);

      const { organizationIds } = params;

      const { organizations } = await this.organizationRepository.getOrganizations({ organizationIds });

      const organizationMap: Record<string, Organization> = {};
      organizations.forEach((organizationEntity) => {
        const { entity: organization } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Organization, entity: organizationEntity });
        organizationMap[organizationEntity.id] = organization;
      });

      const sortedOrganizations = organizationIds.map((organizationId) => organizationMap[organizationId]);

      return { organizations: sortedOrganizations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getOrganizationImageUploadUrl(params: GetOrganizationImageUploadUrlInput): GetOrganizationImageUploadUrlOutput {
    try {
      this.loggerService.trace("getOrganizationImageUploadUrl called", { params }, this.constructor.name);

      const { organizationId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileRepository.getSignedUrl({
        operation: FileOperation.Upload,
        entityType: EntityType.Organization,
        entityId: organizationId,
        mimeType,
      });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexOrganizationForSearch(params: IndexOrganizationForSearchInput): Promise<IndexOrganizationForSearchOutput> {
    try {
      this.loggerService.trace("indexOrganizationForSearch called", { params }, this.constructor.name);

      const { organization: rawOrganization } = params;

      const { organization } = this.organizationRepository.convertRawOrganizationToOrganization({ rawOrganization });

      await this.organizationSearchRepository.indexDocument({ index: SearchIndex.Organization, document: organization });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexOrganizationForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexOrganizationForSearch(params: DeindexOrganizationForSearchInput): Promise<DeindexOrganizationForSearchOutput> {
    try {
      this.loggerService.trace("deindexOrganizationForSearch called", { params }, this.constructor.name);

      const { organizationId } = params;

      await this.organizationSearchRepository.deindexDocument({ index: SearchIndex.Organization, id: organizationId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexOrganizationForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationsBySearchTerm(params: GetOrganizationsBySearchTermInput): Promise<GetOrganizationsBySearchTermOutput> {
    try {
      this.loggerService.trace("getOrganizationsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, organizationIds, limit, exclusiveStartKey } = params;

      const { organizations: organizationEntities, lastEvaluatedKey } = await this.organizationSearchRepository.getOrganizationsBySearchTerm({ searchTerm, organizationIds, limit, exclusiveStartKey });

      const searchOrganizationIds = organizationEntities.map((organization) => organization.id);

      const { organizations } = await this.getOrganizations({ organizationIds: searchOrganizationIds });

      return { organizations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface Organization extends Omit<OrganizationEntity, "imageMimeType"> {
  image: string;
}
export interface OrganizationServiceInterface {
  createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput>;
  getOrganization(params: GetOrganizationInput): Promise<GetOrganizationOutput>;
  updateOrganization(params: UpdateOrganizationInput): Promise<UpdateOrganizationOutput>;
  getOrganizations(params: GetOrganizationsInput): Promise<GetOrganizationsOutput>;
  getOrganizationImageUploadUrl(params: GetOrganizationImageUploadUrlInput): GetOrganizationImageUploadUrlOutput;
  indexOrganizationForSearch(params: IndexOrganizationForSearchInput): Promise<IndexOrganizationForSearchOutput>;
  deindexOrganizationForSearch(params: DeindexOrganizationForSearchInput): Promise<DeindexOrganizationForSearchOutput>;
  getOrganizationsBySearchTerm(params: GetOrganizationsBySearchTermInput): Promise<GetOrganizationsBySearchTermOutput>;
}

export interface CreateOrganizationInput {
  name: string;
  createdBy: UserId;
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

export interface IndexOrganizationForSearchInput {
  organization: RawOrganization;
}

export type IndexOrganizationForSearchOutput = void;

export interface DeindexOrganizationForSearchInput {
  organizationId: OrganizationId;
}

export type DeindexOrganizationForSearchOutput = void;

export interface GetOrganizationsBySearchTermInput {
  searchTerm: string;
  organizationIds?: OrganizationId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationsBySearchTermOutput {
  organizations: Organization[];
  lastEvaluatedKey?: string;
}

export interface GetOrganizationImageUploadUrlInput {
  organizationId: OrganizationId;
  mimeType: ImageMimeType;
}

export interface GetOrganizationImageUploadUrlOutput {
  uploadUrl: string;
}

type OrganizationSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getOrganizationsBySearchTerm">;
