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

  public async deleteOneOnOne(params: DeleteOneOnOneInput): Promise<DeleteOneOnOneOutput> {
    try {
      this.loggerService.trace("deleteOneOnOne called", { params }, this.constructor.name);

      const { oneOnOneId } = params;

      await this.oneOnOneRepository.deleteOneOnone({ oneOnOneId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOneOnOne", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnes(params: GetOneOnOnesInput): Promise<GetOneOnOnesOutput> {
    try {
      this.loggerService.trace("getOneOnOnes called", { params }, this.constructor.name);

      const { oneOnOneIds } = params;

      const { oneOnOnes } = await this.oneOnOneRepository.getOneOnOnes({ oneOnOneIds });

      return { oneOnOnes };
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
  deleteOneOnOne(params: DeleteOneOnOneInput): Promise<DeleteOneOnOneOutput>;
  getOneOnOnes(params: GetOneOnOnesInput): Promise<GetOneOnOnesOutput>
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

export interface DeleteOneOnOneInput {
  oneOnOneId: OneOnOneId;
}

export type DeleteOneOnOneOutput = void;

export interface GetOneOnOnesInput {
  oneOnOneIds: OneOnOneId[];
}

export interface GetOneOnOnesOutput {
  oneOnOnes: OneOnOne[];
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
