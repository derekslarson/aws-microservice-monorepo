import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, Role } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { RawEntity } from "../types/raw.entity.type";
import { TeamId } from "../types/teamId.type";
import { UserId } from "../types/userId.type";

@injectable()
export class TeamUserRelationshipDynamoRepository extends BaseDynamoRepositoryV2<TeamUserRelationship> implements TeamUserRelationshipRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamUserRelationshipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createTeamUserRelationship(params: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("createTeamUserRelationship called", { params }, this.constructor.name);

      const { teamUserRelationship } = params;

      const teamUserRelationshipEntity: RawEntity<TeamUserRelationship> = {
        entityType: EntityType.TeamUserRelationship,
        pk: teamUserRelationship.teamId,
        sk: teamUserRelationship.userId,
        gsi1pk: teamUserRelationship.userId,
        gsi1sk: teamUserRelationship.teamId,
        ...teamUserRelationship,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: teamUserRelationshipEntity,
      }).promise();

      return { teamUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeamUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationship(params: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("getTeamUserRelationship called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      const teamUserRelationship = await this.get({ Key: { pk: teamId, sk: userId } }, "Team-User Relationship");

      return { teamUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamUserRelationship(params: DeleteTeamUserRelationshipInput): Promise<DeleteTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("deleteTeamUserRelationship called", { params }, this.constructor.name);

      const { teamId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: teamId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteTeamUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationshipsByTeamId(params: GetTeamUserRelationshipsByTeamIdInput): Promise<GetTeamUserRelationshipsByTeamIdOutput> {
    try {
      this.loggerService.trace("getTeamUserRelationshipsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey } = params;

      const { Items: teamUserRelationships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": teamId,
          ":user": KeyPrefix.User,
        },
      });

      return {
        teamUserRelationships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationshipsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationshipsByUserId(params: GetTeamUserRelationshipsByUserIdInput): Promise<GetTeamUserRelationshipsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey } = params;

      const { Items: teamUserRelationships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :team)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": userId,
          ":team": KeyPrefix.Team,
        },
      });

      return {
        teamUserRelationships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationshipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamUserRelationshipRepositoryInterface {
  createTeamUserRelationship(params: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput>;
  getTeamUserRelationship(params: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput>;
  deleteTeamUserRelationship(params: DeleteTeamUserRelationshipInput): Promise<DeleteTeamUserRelationshipOutput>;
  getTeamUserRelationshipsByTeamId(params: GetTeamUserRelationshipsByTeamIdInput): Promise<GetTeamUserRelationshipsByTeamIdOutput>;
  getTeamUserRelationshipsByUserId(params: GetTeamUserRelationshipsByUserIdInput): Promise<GetTeamUserRelationshipsByUserIdOutput>;
}

type TeamUserRelationshipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface TeamUserRelationship {
  teamId: TeamId;
  userId: UserId;
  role: Role;
}

export interface CreateTeamUserRelationshipInput {
  teamUserRelationship: TeamUserRelationship;
}

export interface CreateTeamUserRelationshipOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface GetTeamUserRelationshipInput {
  teamId: TeamId;
  userId: UserId;
}

export interface GetTeamUserRelationshipOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface DeleteTeamUserRelationshipInput {
  teamId: TeamId;
  userId: UserId;
}

export type DeleteTeamUserRelationshipOutput = void;

export interface GetTeamUserRelationshipsByTeamIdInput {
  teamId: TeamId;
  exclusiveStartKey?: string;
}

export interface GetTeamUserRelationshipsByTeamIdOutput {
  teamUserRelationships: TeamUserRelationship[];
  lastEvaluatedKey?: string;
}

export interface GetTeamUserRelationshipsByUserIdInput {
  userId: UserId;
  exclusiveStartKey?: string;
}

export interface GetTeamUserRelationshipsByUserIdOutput {
  teamUserRelationships: TeamUserRelationship[];
  lastEvaluatedKey?: string;
}
