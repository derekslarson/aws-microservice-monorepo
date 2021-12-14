import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, OrganizationId, Role, UserId, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { OrganizationServiceInterface, Organization as OrganizationEntity } from "../entity-services/organization.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { Membership as MembershipEntity, MembershipServiceInterface } from "../entity-services/membership.service";
import { MembershipType } from "../enums/membershipType.enum";

@injectable()
export class OrganizationMediatorService implements OrganizationMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    try {
      this.loggerService.trace("createOrganization called", { params }, this.constructor.name);

      const { name, createdBy } = params;

      const { organization: organizationEntity } = await this.organizationService.createOrganization({
        name,
        createdBy,
      });

      const { membership } = await this.membershipService.createMembership({ entityId: organizationEntity.id, userId: createdBy, type: MembershipType.Organization, role: Role.Admin });

      const organization: WithRole<Organization> = {
        ...organizationEntity,
        role: membership.role,
      };

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOrganization(params: UpdateOrganizationInput): Promise<UpdateOrganizationOutput> {
    try {
      this.loggerService.trace("updateOrganization called", { params }, this.constructor.name);

      const { organizationId, name } = params;

      await this.organizationService.updateOrganization({ organizationId, updates: { name } });

      return;
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganization(params: GetOrganizationInput): Promise<GetOrganizationOutput> {
    try {
      this.loggerService.trace("getOrganization called", { params }, this.constructor.name);

      const { organizationId } = params;

      const { organization } = await this.organizationService.getOrganization({ organizationId });

      return { organization };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToOrganization(params: AddUserToOrganizationInput): Promise<AddUserToOrganizationOutput> {
    try {
      this.loggerService.trace("addUserToOrganization called", { params }, this.constructor.name);

      const { organizationId, userId, role } = params;

      const { membership } = await this.membershipService.createMembership({ entityId: organizationId, userId, type: MembershipType.Organization, role });

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

      await this.membershipService.deleteMembership({ entityId: organizationId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getOrganizationImageUploadUrl(params: GetOrganizationImageUploadUrlInput): GetOrganizationImageUploadUrlOutput {
    try {
      this.loggerService.trace("getOrganizationImageUploadUrl called", { params }, this.constructor.name);

      const { organizationId, mimeType } = params;

      const { uploadUrl } = this.organizationService.getOrganizationImageUploadUrl({ organizationId, mimeType });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationsByUserId(params: GetOrganizationsByUserIdInput): Promise<GetOrganizationsByUserIdOutput> {
    try {
      this.loggerService.trace("getOrganizationsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipService.getMembershipsByUserId({ userId, type: MembershipType.Organization, exclusiveStartKey, limit });

      const organizationIds = memberships.map((membership) => membership.entityId);

      const { organizations } = await this.organizationService.getOrganizations({ organizationIds });

      const organizationsWithRoles = organizations.map((organization, i) => ({
        ...organization,
        role: memberships[i].role,
      }));

      return { organizations: organizationsWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isOrganizationMember(params: IsOrganizationMemberInput): Promise<IsOrganizationMemberOutput> {
    try {
      this.loggerService.trace("isOrganizationMember called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      await this.membershipService.getMembership({ entityId: organizationId, userId });

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

      const { membership } = await this.membershipService.getMembership({ entityId: organizationId, userId });

      return { isOrganizationAdmin: membership.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isOrganizationAdmin: false };
      }

      this.loggerService.error("Error in isOrganizationAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationMediatorServiceInterface {
  createOrganization(params: CreateOrganizationInput): Promise<CreateOrganizationOutput>;
  updateOrganization(params: UpdateOrganizationInput): Promise<UpdateOrganizationOutput>;
  getOrganization(params: GetOrganizationInput): Promise<GetOrganizationOutput>;
  addUserToOrganization(params: AddUserToOrganizationInput): Promise<AddUserToOrganizationOutput>;
  removeUserFromOrganization(params: RemoveUserFromOrganizationInput): Promise<RemoveUserFromOrganizationOutput>;
  getOrganizationImageUploadUrl(params: GetOrganizationImageUploadUrlInput): GetOrganizationImageUploadUrlOutput;
  getOrganizationsByUserId(params: GetOrganizationsByUserIdInput): Promise<GetOrganizationsByUserIdOutput>;
  isOrganizationMember(params: IsOrganizationMemberInput): Promise<IsOrganizationMemberOutput>;
  isOrganizationAdmin(params: IsOrganizationAdminInput): Promise<IsOrganizationAdminOutput>;
}
export interface Organization extends Omit<OrganizationEntity, "imageMimeType"> {
  image: string;
}

export type OrganizationMembership = MembershipEntity;

export interface CreateOrganizationInput {
  name: string;
  createdBy: UserId;
}

export interface CreateOrganizationOutput {
  organization: WithRole<Organization>;
}

export interface GetOrganizationInput {
  organizationId: OrganizationId;
}

export interface GetOrganizationOutput {
  organization: Organization;
}

export type UpdateOrganizationInput = Pick<Organization, "name"> & {
  organizationId: OrganizationId;
};

export type UpdateOrganizationOutput = void;

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
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationsByUserIdOutput {
  organizations: WithRole<Organization>[];
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

export interface GetOrganizationImageUploadUrlInput {
  organizationId: OrganizationId;
  mimeType: ImageMimeType;
}

export interface GetOrganizationImageUploadUrlOutput {
  uploadUrl: string;
}
