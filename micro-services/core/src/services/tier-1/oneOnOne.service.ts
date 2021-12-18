/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface, OneOnOneId, OrganizationId, Role, TeamId, UserId } from "@yac/util";
import { OneOnOne as OneOnOneEntity, OneOnOneRepositoryInterface } from "../../repositories/oneOnOne.dynamo.repository";
import { OneOnOneMembership as OneOnOneMembershipEntity, MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { TYPES } from "../../inversion-of-control/types";
import { MembershipFetchType } from "../../enums/membershipFetchType.enum";
import { MembershipType } from "../../enums/membershipType.enum";

@injectable()
export class OneOnOneService implements OneOnOneServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OneOnOneRepositoryInterface) private oneOnOneRepository: OneOnOneRepositoryInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async createOneOnOne(params: CreateOneOnOneInput): Promise<CreateOneOnOneOutput> {
    try {
      this.loggerService.trace("createOneOnOne called", { params }, this.constructor.name);

      const { createdBy, otherUserId, organizationId, teamId } = params;

      const oneOnOneId = [ createdBy, otherUserId ].sort().join("_") as OneOnOneId;

      const now = new Date().toISOString();

      const oneOnOne: OneOnOneEntity = {
        id: oneOnOneId,
        createdBy,
        otherUserId,
        createdAt: now,
        updatedAt: now,
        organizationId,
        teamId,
      };

      const createdByMembership: OneOnOneMembershipEntity = {
        createdAt: now,
        activeAt: now,
        userActiveAt: now,
        unseenMessages: 0,
        userId: createdBy,
        entityId: oneOnOneId,
        type: MembershipType.OneOnOne,
        role: Role.Admin,
      };

      const otherUserMembership: OneOnOneMembershipEntity = {
        createdAt: now,
        activeAt: now,
        userActiveAt: now,
        unseenMessages: 0,
        userId: otherUserId,
        entityId: oneOnOneId,
        type: MembershipType.OneOnOne,
        role: Role.Admin,
      };

      await Promise.all([
        this.oneOnOneRepository.createOneOnOne({ oneOnOne }),
        this.membershipRepository.createMembership({ membership: createdByMembership }),
        this.membershipRepository.createMembership({ membership: otherUserMembership }),
      ]);

      return { oneOnOne };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOne", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOneOnOne(params: DeleteOneOnOneInput): Promise<DeleteOneOnOneOutput> {
    try {
      this.loggerService.trace("deleteOneOnOne called", { params }, this.constructor.name);

      const { oneOnOneId } = params;

      const [ userIdA, userIdB ] = oneOnOneId.split(/_(?=user_)/) as UserId[];

      await Promise.all([
        this.oneOnOneRepository.deleteOneOnOne({ oneOnOneId }),
        this.membershipRepository.deleteMembership({ entityId: oneOnOneId, userId: userIdA }),
        this.membershipRepository.deleteMembership({ entityId: oneOnOneId, userId: userIdB }),
      ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOneOnOne", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOne(params: GetOneOnOneInput): Promise<GetOneOnOneOutput> {
    try {
      this.loggerService.trace("getOneOnOne called", { params }, this.constructor.name);

      const { oneOnOneId } = params;

      const { oneOnOne } = await this.oneOnOneRepository.getOneOnOne({ oneOnOneId });

      return { oneOnOne };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOne", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnes(params: GetOneOnOnesInput): Promise<GetOneOnOnesOutput> {
    try {
      this.loggerService.trace("getOneOnOnes called", { params }, this.constructor.name);

      const { oneOnOneIds } = params;

      const { oneOnOnes } = await this.oneOnOneRepository.getOneOnOnes({ oneOnOneIds });

      const oneOnOneMap: Record<string, OneOnOne> = {};
      oneOnOnes.forEach((oneOnOne) => oneOnOneMap[oneOnOne.id] = oneOnOne);

      const sortedOneOnOnes = oneOnOneIds.map((oneOnOneId) => oneOnOneMap[oneOnOneId]);

      return { oneOnOnes: sortedOneOnOnes };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnes", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.OneOnOne,
        exclusiveStartKey,
        limit,
      });

      const oneOnOneIds = memberships.map((membership) => membership.entityId);

      const { oneOnOnes: oneOnOneEntities } = await this.oneOnOneRepository.getOneOnOnes({ oneOnOneIds });

      const oneOnOnes = oneOnOneEntities.map((oneOnOne, i) => ({
        ...oneOnOne,
        role: memberships[i].role,
        activeAt: memberships[i].activeAt,
        lastViewedAt: memberships[i].userActiveAt,
        unseenMessages: memberships[i].unseenMessages,
      }));

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByTeamId(params: GetOneOnOnesByTeamIdInput): Promise<GetOneOnOnesByTeamIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { oneOnOnes, lastEvaluatedKey } = await this.oneOnOneRepository.getOneOnOnesByTeamId({
        teamId,
        exclusiveStartKey,
        limit,
      });

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByOrganizationId(params: GetOneOnOnesByOrganizationIdInput): Promise<GetOneOnOnesByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { oneOnOnes, lastEvaluatedKey } = await this.oneOnOneRepository.getOneOnOnesByOrganizationId({
        organizationId,
        exclusiveStartKey,
        limit,
      });

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneServiceInterface {
  createOneOnOne(params: CreateOneOnOneInput): Promise<CreateOneOnOneOutput>;
  deleteOneOnOne(params: DeleteOneOnOneInput): Promise<DeleteOneOnOneOutput>;
  getOneOnOne(params: GetOneOnOneInput): Promise<GetOneOnOneOutput>;
  getOneOnOnes(params: GetOneOnOnesInput): Promise<GetOneOnOnesOutput>;
  getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput>;
  getOneOnOnesByTeamId(params: GetOneOnOnesByTeamIdInput): Promise<GetOneOnOnesByTeamIdOutput>;
  getOneOnOnesByOrganizationId(params: GetOneOnOnesByOrganizationIdInput): Promise<GetOneOnOnesByOrganizationIdOutput>;
}

export type OneOnOne = OneOnOneEntity;

export type OneOnOneByUserId = OneOnOne & {
  role: Role;
  activeAt: string;
  lastViewedAt: string;
  unseenMessages: number;
};

export interface CreateOneOnOneInput {
  createdBy: UserId;
  otherUserId: UserId;
  organizationId?: OrganizationId;
  teamId?: TeamId;
}

export interface CreateOneOnOneOutput {
  oneOnOne: OneOnOne;
}

export interface DeleteOneOnOneInput {
  oneOnOneId: OneOnOneId;
}

export type DeleteOneOnOneOutput = void;

export interface GetOneOnOneInput {
  oneOnOneId: OneOnOneId;
}

export interface GetOneOnOneOutput {
  oneOnOne: OneOnOne;
}

export interface GetOneOnOnesInput {
  oneOnOneIds: OneOnOneId[];
}

export interface GetOneOnOnesOutput {
  oneOnOnes: OneOnOne[];
}

export type OneOnOneMembership = OneOnOneMembershipEntity;

export interface GetOneOnOnesByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByUserIdOutput {
  oneOnOnes: OneOnOneByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByTeamIdOutput {
  oneOnOnes: OneOnOne[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByOrganizationIdOutput {
  oneOnOnes: OneOnOne[];
  lastEvaluatedKey?: string;
}
