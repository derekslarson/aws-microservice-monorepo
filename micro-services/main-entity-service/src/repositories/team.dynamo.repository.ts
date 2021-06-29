import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, WithRole } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { TeamConversationRelationship } from "../models/team.conversation.relationship.model";
import { Team } from "../models/team.model";
import { TeamUserRelationship } from "../models/team.user.relationship.model";

@injectable()
export class TeamDynamoRepository extends BaseDynamoRepositoryV2 implements TeamRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createTeam(createTeamInput: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { createTeamInput }, this.constructor.name);

      const { team } = createTeamInput;

      const teamEntity: RawEntity<Team> = {
        type: EntityType.Team,
        pk: team.id,
        sk: team.id,
        ...team,
      };

      await this.documentClient.put({ TableName: this.tableName, Item: teamEntity }).promise();

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, createTeamInput }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByUserId(getTeamsByUserIdInput: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { getTeamsByUserIdInput }, this.constructor.name);

      const { userId, exclusiveStartKey } = getTeamsByUserIdInput;

      const { Items: teamUserRelationships, LastEvaluatedKey } = await this.query<TeamUserRelationship>({
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

      const teams = await this.batchGet<Team>({ Keys: teamUserRelationships.map((relationship) => ({ pk: relationship.teamId, sk: relationship.teamId })) });

      const teamsWithRole = this.addRoleToTeams(teamUserRelationships, teams);

      return {
        teams: teamsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, getTeamsByUserIdInput }, this.constructor.name);

      throw error;
    }
  }

  public async createTeamUserRelationship(createTeamUserRelationshipInput: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("createTeamUserRelationship called", { createTeamUserRelationshipInput }, this.constructor.name);

      const { teamUserRelationship } = createTeamUserRelationshipInput;

      const teamUserRelationshipEntity: RawEntity<TeamUserRelationship> = {
        type: EntityType.TeamUserRelationship,
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
      this.loggerService.error("Error in createTeamUserRelationship", { error, createTeamUserRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationship(getTeamUserRelationshipInput: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("getTeamUserRelationship called", { getTeamUserRelationshipInput }, this.constructor.name);

      const { teamId, userId } = getTeamUserRelationshipInput;

      const teamUserRelationship = await this.get<TeamUserRelationship>({ Key: { pk: teamId, sk: userId } }, "Team-User Relationship");

      return { teamUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationship", { error, getTeamUserRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamUserRelationship(deleteTeamUserRelationshipInput: DeleteTeamUserRelationshipInput): Promise<DeleteTeamUserRelationshipOutput> {
    try {
      this.loggerService.trace("deleteTeamUserRelationship called", { deleteTeamUserRelationshipInput }, this.constructor.name);

      const { teamId, userId } = deleteTeamUserRelationshipInput;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: teamId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteTeamUserRelationship", { error, deleteTeamUserRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  public async createTeamConversationRelationship(createTeamConversationRelationshipInput: CreateTeamConversationRelationshipInput): Promise<CreateTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("createTeamConversationRelationship called", { createTeamConversationRelationshipInput }, this.constructor.name);

      const { teamConversationRelationship } = createTeamConversationRelationshipInput;

      const teamConversationRelationshipEntity: RawEntity<TeamConversationRelationship> = {
        type: EntityType.TeamConversationRelationship,
        pk: teamConversationRelationship.teamId,
        sk: teamConversationRelationship.conversationId,
        ...teamConversationRelationship,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: teamConversationRelationshipEntity,
      }).promise();

      return { teamConversationRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeamConversationRelationship", { error, createTeamConversationRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamConversationRelationship(deleteTeamConversationRelationshipInput: DeleteTeamConversationRelationshipInput): Promise<DeleteTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("deleteTeamConversationRelationship called", { deleteTeamConversationRelationshipInput }, this.constructor.name);

      const { teamId, conversationId } = deleteTeamConversationRelationshipInput;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: teamId, sk: conversationId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteTeamConversationRelationship", { error, deleteTeamConversationRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  private addRoleToTeams(teamUserRelationships: TeamUserRelationship[], teams: Team[]): WithRole<Team>[] {
    try {
      this.loggerService.trace("addRoleToTeams called", { teamUserRelationships, teams }, this.constructor.name);

      const teamMap = teams.reduce((acc: { [key: string]: Team; }, team) => {
        acc[team.id] = team;

        return acc;
      }, {});

      const teamsWithRole = teamUserRelationships.map((relationship) => {
        const team = teamMap[relationship.teamId];

        return {
          ...team,
          role: relationship.role,
        };
      });

      return teamsWithRole;
    } catch (error: unknown) {
      this.loggerService.error("Error in addRoleToTeams", { error, teamUserRelationships, teams }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamRepositoryInterface {
  createTeam(createTeamInput: CreateTeamInput): Promise<CreateTeamOutput>;
  getTeamsByUserId(getTeamsByUserIdInput: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput>;
  createTeamUserRelationship(createTeamUserRelationshipInput: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput>;
  getTeamUserRelationship(getTeamUserRelationshipInput: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput>;
  deleteTeamUserRelationship(deleteTeamUserRelationshipInput: DeleteTeamUserRelationshipInput): Promise<DeleteTeamUserRelationshipOutput>;
  createTeamConversationRelationship(createTeamConversationRelationshipInput: CreateTeamConversationRelationshipInput): Promise<CreateTeamConversationRelationshipOutput>;
  deleteTeamConversationRelationship(deleteTeamConversationRelationshipInput: DeleteTeamConversationRelationshipInput): Promise<DeleteTeamConversationRelationshipOutput>;
}

type TeamRepositoryConfigType = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface CreateTeamInput {
  team: Team;
}

export interface CreateTeamOutput {
  team: Team;
}

export interface CreateTeamUserRelationshipInput {
  teamUserRelationship: TeamUserRelationship;
}

export interface CreateTeamUserRelationshipOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface GetTeamUserRelationshipInput {
  teamId: string;
  userId: string;
}

export interface GetTeamUserRelationshipOutput {
  teamUserRelationship: TeamUserRelationship;
}

export interface DeleteTeamUserRelationshipInput {
  teamId: string;
  userId: string;
}

export type DeleteTeamUserRelationshipOutput = void;

export interface GetTeamsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetTeamsByUserIdOutput {
  teams: WithRole<Team>[];
  lastEvaluatedKey?: string;
}

export interface CreateTeamConversationRelationshipInput {
  teamConversationRelationship: TeamConversationRelationship;
}

export interface CreateTeamConversationRelationshipOutput {
  teamConversationRelationship: TeamConversationRelationship;
}

export interface DeleteTeamConversationRelationshipInput {
  teamId: string;
  conversationId: string;
}

export type DeleteTeamConversationRelationshipOutput = void;
