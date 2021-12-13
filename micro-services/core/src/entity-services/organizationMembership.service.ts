import { inject, injectable } from "inversify";
import { OrganizationId, LoggerServiceInterface, Role, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { OrganizationMembershipRepositoryInterface, OrganizationMembership as OrganizationMembershipEntity, OrganizationMembershipUpdates } from "../repositories/organizationMembership.dynamo.repository";

@injectable()
export class OrganizationMembershipService implements OrganizationMembershipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationMembershipRepositoryInterface) private organizationMembershipRepository: OrganizationMembershipRepositoryInterface,
  ) {}

  public async createOrganizationMembership(params: CreateOrganizationMembershipInput): Promise<CreateOrganizationMembershipOutput> {
    try {
      this.loggerService.trace("createOrganizationMembership called", { params }, this.constructor.name);

      const { organizationId, userId, role } = params;

      const now = new Date().toISOString();

      const organizationMembership: OrganizationMembershipEntity = {
        organizationId,
        userId,
        role,
        createdAt: now,
      };

      await this.organizationMembershipRepository.createOrganizationMembership({ organizationMembership });

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

      const { organizationMembership } = await this.organizationMembershipRepository.getOrganizationMembership({ organizationId, userId });

      return { organizationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOrganizationMembership(params: UpdateOrganizationMembershipInput): Promise<UpdateOrganizationMembershipOutput> {
    try {
      this.loggerService.trace("updateOrganizationMembership called", { params }, this.constructor.name);

      const { organizationId, userId, updates } = params;

      const { organizationMembership } = await this.organizationMembershipRepository.updateOrganizationMembership({ organizationId, userId, updates });

      return { organizationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganizationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOrganizationMembership(params: DeleteOrganizationMembershipInput): Promise<DeleteOrganizationMembershipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { organizationId, userId } = params;

      await this.organizationMembershipRepository.deleteOrganizationMembership({ organizationId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationMembershipsByOrganizationId(params: GetOrganizationMembershipsByOrganizationIdInput): Promise<GetOrganizationMembershipsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOrganizationMembershipsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { organizationMemberships, lastEvaluatedKey } = await this.organizationMembershipRepository.getOrganizationMembershipsByOrganizationId({ organizationId, exclusiveStartKey, limit });

      return { organizationMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationMembershipsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationMembershipsByUserId(params: GetOrganizationMembershipsByUserIdInput): Promise<GetOrganizationMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getOrganizationMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { organizationMemberships, lastEvaluatedKey } = await this.organizationMembershipRepository.getOrganizationMembershipsByUserId({ userId, exclusiveStartKey, limit });

      return { organizationMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationMembershipServiceInterface {
  createOrganizationMembership(params: CreateOrganizationMembershipInput): Promise<CreateOrganizationMembershipOutput>;
  getOrganizationMembership(params: GetOrganizationMembershipInput): Promise<GetOrganizationMembershipOutput>;
  deleteOrganizationMembership(params: DeleteOrganizationMembershipInput): Promise<DeleteOrganizationMembershipOutput>;
  getOrganizationMembershipsByOrganizationId(params: GetOrganizationMembershipsByOrganizationIdInput): Promise<GetOrganizationMembershipsByOrganizationIdOutput>;
  getOrganizationMembershipsByUserId(params: GetOrganizationMembershipsByUserIdInput): Promise<GetOrganizationMembershipsByUserIdOutput>;
}

export type OrganizationMembership = OrganizationMembershipEntity;

export interface CreateOrganizationMembershipInput {
  organizationId: OrganizationId;
  userId: UserId;
  role: Role;
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
  organizationId: OrganizationId;
  userId: UserId;
  updates: OrganizationMembershipUpdates;
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
