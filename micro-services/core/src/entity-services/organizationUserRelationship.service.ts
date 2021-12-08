import { inject, injectable } from "inversify";
import { LoggerServiceInterface, OrganizationId, Role } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { OrganizationUserRelationshipRepositoryInterface, OrganizationUserRelationship as OrganizationUserRelationshipEntity } from "../repositories/organizationUserRelationship.dynamo.repository";
import { UserId } from "../types/userId.type";

@injectable()
export class OrganizationUserRelationshipService implements OrganizationUserRelationshipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationUserRelationshipRepositoryInterface) private organizationUserRelationshipRepository: OrganizationUserRelationshipRepositoryInterface,
  ) {}

  public async createOrganizationUserRelationship(params: CreateOrganizationUserRelationshipInput): Promise<CreateOrganizationUserRelationshipOutput> {
    try {
      this.loggerService.trace("createOrganizationUserRelationship called", { params }, this.constructor.name);

      const { organizationId, userId, role } = params;

      const organizationUserRelationship: OrganizationUserRelationshipEntity = {
        organizationId,
        userId,
        role,
      };

      await this.organizationUserRelationshipRepository.createOrganizationUserRelationship({ organizationUserRelationship });

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

      const { organizationUserRelationship } = await this.organizationUserRelationshipRepository.getOrganizationUserRelationship({ organizationId, userId });

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

      await this.organizationUserRelationshipRepository.deleteOrganizationUserRelationship({ organizationId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOrganizationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationUserRelationshipsByOrganizationId(params: GetOrganizationUserRelationshipsByOrganizationIdInput): Promise<GetOrganizationUserRelationshipsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOrganizationUserRelationshipsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { organizationUserRelationships, lastEvaluatedKey } = await this.organizationUserRelationshipRepository.getOrganizationUserRelationshipsByOrganizationId({ organizationId, exclusiveStartKey, limit });

      return { organizationUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationUserRelationshipsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationUserRelationshipsByUserId(params: GetOrganizationUserRelationshipsByUserIdInput): Promise<GetOrganizationUserRelationshipsByUserIdOutput> {
    try {
      this.loggerService.trace("getOrganizationUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { organizationUserRelationships, lastEvaluatedKey } = await this.organizationUserRelationshipRepository.getOrganizationUserRelationshipsByUserId({ userId, exclusiveStartKey, limit });

      return { organizationUserRelationships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationUserRelationshipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationUserRelationshipServiceInterface {
  createOrganizationUserRelationship(params: CreateOrganizationUserRelationshipInput): Promise<CreateOrganizationUserRelationshipOutput>;
  getOrganizationUserRelationship(params: GetOrganizationUserRelationshipInput): Promise<GetOrganizationUserRelationshipOutput>;
  deleteOrganizationUserRelationship(params: DeleteOrganizationUserRelationshipInput): Promise<DeleteOrganizationUserRelationshipOutput>;
  getOrganizationUserRelationshipsByOrganizationId(params: GetOrganizationUserRelationshipsByOrganizationIdInput): Promise<GetOrganizationUserRelationshipsByOrganizationIdOutput>;
  getOrganizationUserRelationshipsByUserId(params: GetOrganizationUserRelationshipsByUserIdInput): Promise<GetOrganizationUserRelationshipsByUserIdOutput>;
}

export type OrganizationUserRelationship = OrganizationUserRelationshipEntity;
export interface CreateOrganizationUserRelationshipInput {
  organizationId: OrganizationId;
  userId: UserId;
  role: Role;
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
