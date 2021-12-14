import { inject, injectable } from "inversify";
import { OneOnOneId, LoggerServiceInterface, OrganizationId, TeamId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { OneOnOneRepositoryInterface, OneOnOne as OneOnOneEntity } from "../repositories/oneOnOne.dynamo.repository";

@injectable()
export class OneOnOneService implements OneOnOneServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OneOnOneRepositoryInterface) private oneOnOneRepository: OneOnOneRepositoryInterface,
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

      await this.oneOnOneRepository.createOneOnOne({ oneOnOne });

      return { oneOnOne };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOne", { error, params }, this.constructor.name);

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

  public async getOneOnOnesByTeamId(params: GetOneOnOnesByTeamIdInput): Promise<GetOneOnOnesByTeamIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { oneOnOnes, lastEvaluatedKey } = await this.oneOnOneRepository.getOneOnOnesByTeamId({ teamId, exclusiveStartKey, limit });

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

      const { oneOnOnes, lastEvaluatedKey } = await this.oneOnOneRepository.getOneOnOnesByOrganizationId({ organizationId, exclusiveStartKey, limit });

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneServiceInterface {
  createOneOnOne(params: CreateOneOnOneInput): Promise<CreateOneOnOneOutput>;
  getOneOnOne(params: GetOneOnOneInput): Promise<GetOneOnOneOutput>;
  getOneOnOnesByTeamId(params: GetOneOnOnesByTeamIdInput): Promise<GetOneOnOnesByTeamIdOutput>;
  getOneOnOnesByOrganizationId(params: GetOneOnOnesByOrganizationIdInput): Promise<GetOneOnOnesByOrganizationIdOutput>;
}

export type OneOnOne = OneOnOneEntity;

export interface CreateOneOnOneInput {
  createdBy: UserId;
  otherUserId: UserId;
  organizationId?: OrganizationId;
  teamId?: TeamId;
}

export interface CreateOneOnOneOutput {
  oneOnOne: OneOnOne;
}

export interface GetOneOnOneInput {
  oneOnOneId: OneOnOneId;
}

export interface GetOneOnOneOutput {
  oneOnOne: OneOnOne;
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
