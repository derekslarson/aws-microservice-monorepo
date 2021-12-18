import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, OneOnOneId, LoggerServiceInterface, OrganizationId, TeamId, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";

@injectable()
export class OneOnOneDynamoRepository extends BaseDynamoRepositoryV2<OneOnOne> implements OneOnOneRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: OneOnOneRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createOneOnOne(params: CreateOneOnOneInput): Promise<CreateOneOnOneOutput> {
    try {
      this.loggerService.trace("createOneOnOne called", { params }, this.constructor.name);

      const { oneOnOne } = params;

      const oneOnOneEntity: RawOneOnOne = {
        entityType: EntityType.OneOnOne,
        pk: oneOnOne.id,
        sk: EntityType.OneOnOne,
        gsi1pk: oneOnOne.teamId || oneOnOne.organizationId,
        gsi1sk: oneOnOne.id,
        ...oneOnOne,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: oneOnOneEntity,
      }).promise();

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

      const oneOnOne = await this.get({ Key: { pk: oneOnOneId, sk: EntityType.OneOnOne } }, "OneOnOne");

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

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: oneOnOneId, sk: EntityType.OneOnOne },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOneOnOne", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnes(params: GetOneOnOnesInput): Promise<GetOneOnOnesOutput> {
    try {
      this.loggerService.trace("getOneOnOnes called", { params }, this.constructor.name);

      const { oneOnOneIds } = params;

      const oneOnOnes = await this.batchGet({ Keys: oneOnOneIds.map((oneOnOneId) => ({ pk: oneOnOneId, sk: EntityType.OneOnOne })) });

      return { oneOnOnes };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnes", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByOrganizationId(params: GetOneOnOnesByOrganizationIdInput): Promise<GetOneOnOnesByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { oneOnOnes, lastEvaluatedKey } = await this.getOneOnOnesByTeamIdOrOrganizationId({ teamIdOrOrganizationId: organizationId, exclusiveStartKey, limit });

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByTeamId(params: GetOneOnOnesByTeamIdInput): Promise<GetOneOnOnesByTeamIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { oneOnOnes, lastEvaluatedKey } = await this.getOneOnOnesByTeamIdOrOrganizationId({ teamIdOrOrganizationId: teamId, exclusiveStartKey, limit });

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getOneOnOnesByTeamIdOrOrganizationId(params: GetOneOnOnesByTeamIdOrOrganizationIdInput): Promise<GetOneOnOnesByTeamIdOrOrganizationIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByTeamIdOrOrganizationId called", { params }, this.constructor.name);

      const { teamIdOrOrganizationId, exclusiveStartKey, limit } = params;

      const { Items: oneOnOnes, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :teamIdOrOrgId AND begins_with(#gsi1sk, :oneOnOneIdPrefix)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":teamIdOrOrgId": teamIdOrOrganizationId,
          ":oneOnOneIdPrefix": KeyPrefix.OneOnOne,
        },
      });

      return {
        oneOnOnes,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByTeamIdOrOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneRepositoryInterface {
  createOneOnOne(params: CreateOneOnOneInput): Promise<CreateOneOnOneOutput>;
  getOneOnOne(params: GetOneOnOneInput): Promise<GetOneOnOneOutput>;
  deleteOneOnOne(params: DeleteOneOnOneInput): Promise<DeleteOneOnOneOutput>
  getOneOnOnes(params: GetOneOnOnesInput): Promise<GetOneOnOnesOutput>;
  getOneOnOnesByOrganizationId(params: GetOneOnOnesByOrganizationIdInput): Promise<GetOneOnOnesByOrganizationIdOutput>;
  getOneOnOnesByTeamId(params: GetOneOnOnesByTeamIdInput): Promise<GetOneOnOnesByTeamIdOutput>
}

type OneOnOneRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface OneOnOne {
  id: OneOnOneId;
  createdBy: UserId;
  otherUserId: UserId;
  createdAt: string;
  updatedAt: string;
  organizationId?: OrganizationId;
  teamId?: TeamId;
}

export interface RawOneOnOne extends OneOnOne {
  entityType: EntityType.OneOnOne,
  pk: OneOnOneId;
  sk: EntityType.OneOnOne;
  gsi1pk?: OrganizationId | TeamId;
  gsi1sk?: OneOnOneId;
}

export interface CreateOneOnOneInput {
  oneOnOne: OneOnOne;
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

export interface GetOneOnOnesByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByOrganizationIdOutput {
  oneOnOnes: OneOnOne[];
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

interface GetOneOnOnesByTeamIdOrOrganizationIdInput {
  teamIdOrOrganizationId: TeamId | OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetOneOnOnesByTeamIdOrOrganizationIdOutput {
  oneOnOnes: OneOnOne[];
  lastEvaluatedKey?: string;
}
