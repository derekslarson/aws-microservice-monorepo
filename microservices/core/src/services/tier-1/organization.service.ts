/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { Role } from "@yac/util/src/enums/role.enum";
import { UserId } from "@yac/util/src/types/userId.type";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { FileOperation } from "@yac/util/src/enums/fileOperation.enum";
import { BillingPlan } from "@yac/util/src/enums/billingPlan.enum";
import { WithRole } from "@yac/util/src/types/withRole.type";
import { RawOrganization as RawOrganizationEntity, Organization as OrganizationEntity, OrganizationRepositoryInterface, OrganizationUpdates } from "../../repositories/organization.dynamo.repository";
import { OrganizationMembership as OrganizationMembershipEntity, MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { ImageFileRepositoryInterface } from "../../repositories/image.s3.repository";
import { TYPES } from "../../inversion-of-control/types";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MembershipType } from "../../enums/membershipType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";
import { MembershipFetchType } from "../../enums/membershipFetchType.enum";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { SearchIndex } from "../../enums/searchIndex.enum";

@injectable()
export class OrganizationService implements OrganizationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.OrganizationRepositoryInterface) private organizationRepository: OrganizationRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private organizationSearchRepository: OrganizationSearchRepositoryInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    try {
      this.loggerService.trace("createOrganization called", { params }, this.constructor.name);

      const { name, createdBy } = params;

      const organizationId: OrganizationId = `${KeyPrefix.Organization}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const now = new Date().toISOString();

      const organizationEntity: OrganizationEntity = {
        imageMimeType,
        id: organizationId,
        name,
        createdBy,
        createdAt: now,
        updatedAt: now,
        billingPlan: BillingPlan.Free,
      };

      await Promise.all([
        this.organizationRepository.createOrganization({ organization: organizationEntity }),
        this.addUserToOrganization({ userId: createdBy, organizationId, role: Role.Admin }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.Organization, entityId: organizationId, file: image, mimeType: imageMimeType }),
      ]);

      const { entity: organization } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Organization, entity: organizationEntity });

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOrganization(params: UpdateOrganizationInput): Promise<UpdateOrganizationOutput> {
    try {
      this.loggerService.trace("updateOrganization called", { params }, this.constructor.name);

      const { organizationId, updates } = params;

      await this.organizationRepository.updateOrganization({ organizationId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToOrganization(params: AddUserToOrganizationInput): Promise<AddUserToOrganizationOutput> {
    try {
      this.loggerService.trace("addUserToOrganization called", { params }, this.constructor.name);

      const { organizationId, userId, role } = params;

      const now = new Date().toISOString();

      const membership: OrganizationMembership = {
        createdAt: now,
        activeAt: now,
        userId,
        entityId: organizationId,
        type: MembershipType.Organization,
        role,
      };

      await this.membershipRepository.createMembership({ membership });

      return { organizationMembership: membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromOrganization(params: RemoveUserFromOrganizationInput): Promise<RemoveUserFromOrganizationOutput> {
    try {
      this.loggerService.trace("removeUserFromOrganization called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      await this.membershipRepository.deleteMembership({ entityId: organizationId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromOrganization", { error, params }, this.constructor.name);

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

  public async getOrganizations(params: GetOrganizationsInput): Promise<GetOrganizationsOutput> {
    try {
      this.loggerService.trace("getOrganizations called", { params }, this.constructor.name);

      const { organizationIds } = params;

      const { organizations } = await this.organizationRepository.getOrganizations({ organizationIds });

      const organizationMap: Record<string, Organization> = {};
      organizations.forEach((organizationEntity) => {
        const { entity: organization } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.Organization, entity: organizationEntity });

        organizationMap[organization.id] = organization;
      });

      const sortedOrganizations = organizationIds.map((organizationId) => organizationMap[organizationId]);

      return { organizations: sortedOrganizations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationsByUserId(params: GetOrganizationsByUserIdInput): Promise<GetOrganizationsByUserIdOutput> {
    try {
      this.loggerService.trace("getOrganizationsByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, exclusiveStartKey, limit } = params;

      if (searchTerm) {
        const { memberships } = await this.membershipRepository.getMembershipsByUserId({ userId, type: MembershipFetchType.Organization });

        const organizationIds = memberships.map((membership) => membership.entityId);

        const { organizations: organizationEntities, lastEvaluatedKey } = await this.getOrganizationsBySearchTerm({ organizationIds, searchTerm, exclusiveStartKey, limit });

        const membershipMap: Record<string, OrganizationMembership> = {};
        memberships.forEach((membership) => membershipMap[membership.entityId] = membership);

        const organizations = organizationEntities.map((organizationEntity) => ({
          ...organizationEntity,
          role: membershipMap[organizationEntity.id].role,
        }));

        return { organizations, lastEvaluatedKey };
      }

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.Organization,
        exclusiveStartKey,
        limit,
      });

      const organizationIds = memberships.map((membership) => membership.entityId);

      const { organizations: organizationEntities } = await this.getOrganizations({ organizationIds });

      const organizations = organizationEntities.map((organizationEntity, i) => ({
        ...organizationEntity,
        role: memberships[i].role,
      }));

      return { organizations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationsByUserId", { error, params }, this.constructor.name);

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

  public async isOrganizationMember(params: IsOrganizationMemberInput): Promise<IsOrganizationMemberOutput> {
    try {
      this.loggerService.trace("isOrganizationMember called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      await this.membershipRepository.getMembership({ entityId: organizationId, userId });

      return { isOrganizationMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isOrganizationMember: false };
      }
      this.loggerService.error("Error in isOrganizationMember", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isOrganizationAdmin(params: IsOrganizationAdminInput): Promise<IsOrganizationAdminOutput> {
    try {
      this.loggerService.trace("isOrganizationAdmin called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      const { membership } = await this.membershipRepository.getMembership({ entityId: organizationId, userId });

      return { isOrganizationAdmin: membership.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isOrganizationAdmin: false };
      }
      this.loggerService.error("Error in isOrganizationAdmin", { error, params }, this.constructor.name);

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

  private async getOrganizationsBySearchTerm(params: GetOrganizationsBySearchTermInput): Promise<GetOrganizationsBySearchTermOutput> {
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

export interface OrganizationServiceInterface {
  createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput>;
  updateOrganization(params: UpdateOrganizationInput): Promise<UpdateOrganizationOutput>;
  getOrganization(params: GetOrganizationInput): Promise<GetOrganizationOutput>;
  getOrganizations(params: GetOrganizationsInput): Promise<GetOrganizationsOutput>;
  getOrganizationsByUserId(params: GetOrganizationsByUserIdInput): Promise<GetOrganizationsByUserIdOutput>;
  getOrganizationImageUploadUrl(params: GetOrganizationImageUploadUrlInput): GetOrganizationImageUploadUrlOutput;
  addUserToOrganization(params: AddUserToOrganizationInput): Promise<AddUserToOrganizationOutput>;
  removeUserFromOrganization(params: RemoveUserFromOrganizationInput): Promise<RemoveUserFromOrganizationOutput>;
  isOrganizationMember(params: IsOrganizationMemberInput): Promise<IsOrganizationMemberOutput>;
  isOrganizationAdmin(params: IsOrganizationAdminInput): Promise<IsOrganizationAdminOutput>;
  indexOrganizationForSearch(params: IndexOrganizationForSearchInput): Promise<IndexOrganizationForSearchOutput>;
  deindexOrganizationForSearch(params: DeindexOrganizationForSearchInput): Promise<DeindexOrganizationForSearchOutput>;
}

export type Organization = Omit<OrganizationEntity, "imageMimeType"> & {
  image: string;
};

export type OrganizationByUserId = WithRole<Organization>;

export interface CreateOrganizationInput {
  name: string;
  createdBy: UserId;
}

export interface CreateOrganizationOutput {
  organization: Organization;
}

export interface UpdateOrganizationInput {
  organizationId: OrganizationId;
  updates: OrganizationUpdates;
}

export type UpdateOrganizationOutput = void;

export interface GetOrganizationInput {
  organizationId: OrganizationId;
}

export interface GetOrganizationOutput {
  organization: Organization;
}

export interface GetOrganizationsInput {
  organizationIds: OrganizationId[];
}

export interface GetOrganizationsOutput {
  organizations: Organization[];
}

export interface GetOrganizationImageUploadUrlInput {
  organizationId: OrganizationId;
  mimeType: ImageMimeType;
}

export interface GetOrganizationImageUploadUrlOutput {
  uploadUrl: string;
}

export type OrganizationMembership = OrganizationMembershipEntity;

export interface AddUserToOrganizationInput {
  organizationId: OrganizationId;
  userId: UserId;
  role: Role;
}

export interface AddUserToOrganizationOutput {
  organizationMembership: OrganizationMembership;
}

export interface RemoveUserFromOrganizationInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export type RemoveUserFromOrganizationOutput = void;

export interface GetOrganizationsByUserIdInput {
  userId: UserId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationsByUserIdOutput {
  organizations: OrganizationByUserId[];
  lastEvaluatedKey?: string;
}

export interface IsOrganizationMemberInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export interface IsOrganizationMemberOutput {
  isOrganizationMember: boolean;
}

export interface IsOrganizationAdminInput {
  organizationId: OrganizationId;
  userId: UserId;
}

export interface IsOrganizationAdminOutput {
  isOrganizationAdmin: boolean;
}

export interface IndexOrganizationForSearchInput {
  organization: RawOrganizationEntity;
}

export type IndexOrganizationForSearchOutput = void;

export interface DeindexOrganizationForSearchInput {
  organizationId: OrganizationId;
}

export type DeindexOrganizationForSearchOutput = void;

interface GetOrganizationsBySearchTermInput {
  searchTerm: string;
  organizationIds?: OrganizationId[];
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetOrganizationsBySearchTermOutput {
  organizations: Organization[];
  lastEvaluatedKey?: string;
}

type OrganizationSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getOrganizationsBySearchTerm">;
