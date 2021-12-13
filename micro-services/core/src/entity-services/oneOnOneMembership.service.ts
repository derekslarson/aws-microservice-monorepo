import { inject, injectable } from "inversify";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { OneOnOneMembershipRepositoryInterface, OneOnOneMembership as OneOnOneMembershipEntity, OneOnOneMembershipUpdates } from "../repositories/oneOnOneMembership.dynamo.repository";

@injectable()
export class OneOnOneMembershipService implements OneOnOneMembershipServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OneOnOneMembershipRepositoryInterface) private oneOnOneMembershipRepository: OneOnOneMembershipRepositoryInterface,
  ) {}

  public async createOneOnOneMembership(params: CreateOneOnOneMembershipInput): Promise<CreateOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("createOneOnOneMembership called", { params }, this.constructor.name);

      const { userId, otherUserId } = params;

      const now = new Date().toISOString();

      const oneOnOneMembership: OneOnOneMembershipEntity = {
        userId,
        otherUserId,
        createdAt: now,
        activeAt: now,
      };

      await this.oneOnOneMembershipRepository.createOneOnOneMembership({ oneOnOneMembership });

      return { oneOnOneMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOneMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOneMembership(params: GetOneOnOneMembershipInput): Promise<GetOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("getOneOnOneMembership called", { params }, this.constructor.name);

      const { userId, otherUserId } = params;

      const { oneOnOneMembership } = await this.oneOnOneMembershipRepository.getOneOnOneMembership({ userId, otherUserId });

      return { oneOnOneMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOneMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateOneOnOneMembership(params: UpdateOneOnOneMembershipInput): Promise<UpdateOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("updateOneOnOneMembership called", { params }, this.constructor.name);

      const { userId, otherUserId, updates } = params;

      const { oneOnOneMembership } = await this.oneOnOneMembershipRepository.updateOneOnOneMembership({ userId, otherUserId, updates });

      return { oneOnOneMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOneOnOneMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOneOnOneMembership(params: DeleteOneOnOneMembershipInput): Promise<DeleteOneOnOneMembershipOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { params }, this.constructor.name);

      const { userId, otherUserId } = params;

      await this.oneOnOneMembershipRepository.deleteOneOnOneMembership({ userId, otherUserId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOneMembershipsByUserId(params: GetOneOnOneMembershipsByUserIdInput): Promise<GetOneOnOneMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOneMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { oneOnOneMemberships, lastEvaluatedKey } = await this.oneOnOneMembershipRepository.getOneOnOneMembershipsByUserId({ userId, exclusiveStartKey, limit });

      return { oneOnOneMemberships, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOneMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneMembershipServiceInterface {
  createOneOnOneMembership(params: CreateOneOnOneMembershipInput): Promise<CreateOneOnOneMembershipOutput>;
  getOneOnOneMembership(params: GetOneOnOneMembershipInput): Promise<GetOneOnOneMembershipOutput>;
  deleteOneOnOneMembership(params: DeleteOneOnOneMembershipInput): Promise<DeleteOneOnOneMembershipOutput>;
  getOneOnOneMembershipsByUserId(params: GetOneOnOneMembershipsByUserIdInput): Promise<GetOneOnOneMembershipsByUserIdOutput>;
}

export type OneOnOneMembership = OneOnOneMembershipEntity;

export interface CreateOneOnOneMembershipInput {
  userId: UserId;
  otherUserId: UserId;
}

export interface CreateOneOnOneMembershipOutput {
  oneOnOneMembership: OneOnOneMembership;
}

export interface GetOneOnOneMembershipInput {
  userId: UserId;
  otherUserId: UserId;
}

export interface GetOneOnOneMembershipOutput {
  oneOnOneMembership: OneOnOneMembership;
}

export interface UpdateOneOnOneMembershipInput {
  userId: UserId;
  otherUserId: UserId;
  updates: OneOnOneMembershipUpdates;
}

export interface UpdateOneOnOneMembershipOutput {
  oneOnOneMembership: OneOnOneMembership;
}

export interface DeleteOneOnOneMembershipInput {
  userId: UserId;
  otherUserId: UserId;
}

export type DeleteOneOnOneMembershipOutput = void;

export interface GetOneOnOneMembershipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}
export interface GetOneOnOneMembershipsByUserIdOutput {
  oneOnOneMemberships: OneOnOneMembership[];
  lastEvaluatedKey?: string;
}
