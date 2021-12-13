import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EntityId, MembershipRepositoryInterface, Membership as MembershipEntity, MembershipUpdates } from "../repositories/membership.dynamo.repository";
import { MembershipType } from "../enums/membershipType.enum";

@injectable()
export class MembershipService implements MembershipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async createMembership(params: CreateMembershipInput): Promise<CreateMembershipOutput> {
    try {
      this.loggerService.trace("createMembership called", { params }, this.constructor.name);

      const { entityId, userId, role, type, dueAt } = params;

      const now = new Date().toISOString();

      const membership: MembershipEntity = {
        entityId,
        userId,
        type,
        role,
        createdAt: now,
        activeAt: now,
        dueAt,
      };

      await this.membershipRepository.createMembership({ membership });

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembership(params: GetMembershipInput): Promise<GetMembershipOutput> {
    try {
      this.loggerService.trace("getMembership called", { params }, this.constructor.name);

      const { entityId, userId } = params;

      const { membership } = await this.membershipRepository.getMembership({ entityId, userId });

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMembership(params: UpdateMembershipInput): Promise<UpdateMembershipOutput> {
    try {
      this.loggerService.trace("updateMembership called", { params }, this.constructor.name);

      const { entityId, userId, updates } = params;

      const { membership } = await this.membershipRepository.updateMembership({ entityId, userId, updates });

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteMembership(params: DeleteMembershipInput): Promise<DeleteMembershipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { entityId, userId } = params;

      await this.membershipRepository.deleteMembership({ entityId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembershipsByEntityId(params: GetMembershipsByEntityIdInput): Promise<GetMembershipsByEntityIdOutput> {
    try {
      this.loggerService.trace("getMembershipsByEntityId called", { params }, this.constructor.name);

      const { entityId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByEntityId({ entityId, exclusiveStartKey, limit });

      return { memberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembershipsByEntityId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembershipsByUserId(params: GetMembershipsByUserIdInput): Promise<GetMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, type, sortByDueAt, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({ userId, type, sortByDueAt, exclusiveStartKey, limit });

      return { memberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MembershipServiceInterface {
  createMembership(params: CreateMembershipInput): Promise<CreateMembershipOutput>;
  getMembership(params: GetMembershipInput): Promise<GetMembershipOutput>;
  updateMembership(params: UpdateMembershipInput): Promise<UpdateMembershipOutput>;
  deleteMembership(params: DeleteMembershipInput): Promise<DeleteMembershipOutput>;
  getMembershipsByEntityId(params: GetMembershipsByEntityIdInput): Promise<GetMembershipsByEntityIdOutput>;
  getMembershipsByUserId(params: GetMembershipsByUserIdInput): Promise<GetMembershipsByUserIdOutput>;
}

export type Membership = MembershipEntity;

export interface CreateMembershipInput {
  entityId: EntityId;
  userId: UserId;
  role: Role;
  type: MembershipType;
  dueAt?: string;
}

export interface CreateMembershipOutput {
  membership: Membership;
}

export interface GetMembershipInput {
  entityId: EntityId;
  userId: UserId;
}

export interface GetMembershipOutput {
  membership: Membership;
}

export interface UpdateMembershipInput {
  entityId: EntityId;
  userId: UserId;
  updates: MembershipUpdates;
}

export interface UpdateMembershipOutput {
  membership: Membership;
}

export interface DeleteMembershipInput {
  entityId: EntityId;
  userId: UserId;
}

export type DeleteMembershipOutput = void;

export interface GetMembershipsByEntityIdInput {
  entityId: EntityId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMembershipsByEntityIdOutput {
  memberships: Membership[];
  lastEvaluatedKey?: string;
}
export interface GetMembershipsByUserIdInput {
  userId: UserId;
  type?: MembershipType;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}
export interface GetMembershipsByUserIdOutput {
  memberships: Membership[];
  lastEvaluatedKey?: string;
}
