import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, Role } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { UserId } from "../types/userId.type";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { TeamId } from "./team.dynamo.repository.v2";

@injectable()
export class TeamMembershipDynamoRepository extends BaseDynamoRepositoryV2<TeamMembership> implements TeamMembershipRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamMembershipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
  }

  public async createTeamMembership(params: CreateTeamMembershipInput): Promise<CreateTeamMembershipOutput> {
    try {
      this.loggerService.trace("createTeamMembership called", { params }, this.constructor.name);

      const { teamMembership } = params;

      const teamMembershipEntity: RawTeamMembership = {
        entityType: EntityTypeV2.TeamMembership,
        pk: teamMembership.userId,
        sk: teamMembership.teamId,
        gsi1pk: teamMembership.teamId,
        gsi1sk: `${KeyPrefixV2.User}${KeyPrefixV2.Active}${teamMembership.userActiveAt}`,
        gsi2pk: teamMembership.userId,
        gsi2sk: `${KeyPrefixV2.Team}${KeyPrefixV2.Active}${teamMembership.teamActiveAt}`,
        ...teamMembership,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: teamMembershipEntity,
      }).promise();

      return { teamMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeamMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamMembership(params: GetTeamMembershipInput): Promise<GetTeamMembershipOutput> {
    try {
      this.loggerService.trace("getTeamMembership called", { params }, this.constructor.name);

      const { teamId, userId } = params;

      const teamMembership = await this.get({ Key: { pk: userId, sk: teamId } }, "Team Membership");

      return { teamMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamMembership(params: DeleteTeamMembershipInput): Promise<DeleteTeamMembershipOutput> {
    try {
      this.loggerService.trace("deleteTeamMembership called", { params }, this.constructor.name);

      const { teamId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: teamId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteTeamMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamMembershipsByTeamId(params: GetTeamMembershipsByTeamIdInput): Promise<GetTeamMembershipsByTeamIdOutput> {
    try {
      this.loggerService.trace("getTeamMembershipsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { Items: teamMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :teamId AND begins_with(#gsi1sk, :userActive)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":teamId": teamId,
          ":userActive": `${KeyPrefixV2.User}${KeyPrefixV2.Active}`,
        },
      });

      return {
        teamMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamMembershipsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamMembershipsByUserId(params: GetTeamMembershipsByUserIdInput): Promise<GetTeamMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { Items: teamMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiTwoIndexName,
        KeyConditionExpression: "#gsi2pk = :userId AND begins_with(#gsi2sk, :teamActive)",
        ExpressionAttributeNames: {
          "#gsi2pk": "gsi2pk",
          "#gsi2sk": "gsi2sk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":teamActive": `${KeyPrefixV2.Team}${KeyPrefixV2.Active}`,
        },
      });

      return {
        teamMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamMembershipRepositoryInterface {
  createTeamMembership(params: CreateTeamMembershipInput): Promise<CreateTeamMembershipOutput>;
  getTeamMembership(params: GetTeamMembershipInput): Promise<GetTeamMembershipOutput>;
  deleteTeamMembership(params: DeleteTeamMembershipInput): Promise<DeleteTeamMembershipOutput>;
  getTeamMembershipsByTeamId(params: GetTeamMembershipsByTeamIdInput): Promise<GetTeamMembershipsByTeamIdOutput>;
  getTeamMembershipsByUserId(params: GetTeamMembershipsByUserIdInput): Promise<GetTeamMembershipsByUserIdOutput>;
}

type TeamMembershipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface TeamMembership {
  userId: UserId;
  teamId: TeamId;
  role: Role;
  createdAt: string;
  userActiveAt: string;
  teamActiveAt: string;
}
export interface RawTeamMembership extends TeamMembership {
  entityType: EntityTypeV2.TeamMembership,
  pk: UserId;
  sk: TeamId;
  gsi1pk: TeamId;
  gsi1sk: `${KeyPrefixV2.User}${KeyPrefixV2.Active}${string}`;
  gsi2pk: UserId;
  gsi2sk: `${KeyPrefixV2.Team}${KeyPrefixV2.Active}${string}`;
}

export interface CreateTeamMembershipInput {
  teamMembership: TeamMembership;
}

export interface CreateTeamMembershipOutput {
  teamMembership: TeamMembership;
}

export interface GetTeamMembershipInput {
  teamId: TeamId;
  userId: UserId;
}

export interface GetTeamMembershipOutput {
  teamMembership: TeamMembership;
}

export interface DeleteTeamMembershipInput {
  teamId: TeamId;
  userId: UserId;
}

export type DeleteTeamMembershipOutput = void;

export interface GetTeamMembershipsByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamMembershipsByTeamIdOutput {
  teamMemberships: TeamMembership[];
  lastEvaluatedKey?: string;
}

export interface GetTeamMembershipsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamMembershipsByUserIdOutput {
  teamMemberships: TeamMembership[];
  lastEvaluatedKey?: string;
}
