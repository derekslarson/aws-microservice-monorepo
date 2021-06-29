import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, Team, Role, TeamUserRelationship, TeamConversationRelationship, KeyPrefix, EntityType, WithRole } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

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

  public async createTeam(team: Omit<Team, "id">): Promise<Team> {
    try {
      this.loggerService.trace("createTeam called", { team }, this.constructor.name);

      const id = `${KeyPrefix.Team}${this.idService.generateId()}`;

      const teamEntity: RawEntity<Team> = {
        type: EntityType.Team,
        pk: id,
        sk: id,
        id,
        name: team.name,
        createdBy: team.createdBy,
      };

      await Promise.all([
        this.documentClient.put({ TableName: this.tableName, Item: teamEntity }).promise(),
        this.addUserToTeam(id, team.createdBy, Role.Admin),
      ]);

      return this.cleanse(teamEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, team }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToTeam(teamId: string, userId: string, role: Role): Promise<void> {
    try {
      this.loggerService.trace("addUserToTeam called", { teamId, userId, role }, this.constructor.name);

      const teamUserRelationship: RawEntity<TeamUserRelationship> = {
        type: EntityType.TeamUserRelationship,
        pk: teamId,
        sk: userId,
        gsi1pk: userId,
        gsi1sk: teamId,
        teamId,
        userId,
        role,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: teamUserRelationship,
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, teamId, userId, role }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationship(teamId: string, userId: string): Promise<TeamUserRelationship> {
    try {
      this.loggerService.trace("getTeamUserRelationship called", { teamId, userId }, this.constructor.name);

      const teamUserRelationship = await this.get<TeamUserRelationship>({ Key: { pk: teamId, sk: userId } }, "Team-User Relationship");

      return teamUserRelationship;
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationship", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromTeam(teamId: string, userId: string): Promise<void> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { teamId, userId }, this.constructor.name);

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: teamId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationshipsByTeamId(teamId: string): Promise<TeamUserRelationship[]> {
    try {
      this.loggerService.trace("getTeamUserRelationshipsByTeamId called", { teamId }, this.constructor.name);

      const { Items: teamUserRelationships } = await this.query<TeamUserRelationship>({
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

      return teamUserRelationships;
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationshipsByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ teams: WithRole<Team>[]; lastEvaluatedKey?: string }> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { userId }, this.constructor.name);

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
      this.loggerService.error("Error in getTeamsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async addConversationToTeam(teamId: string, conversationId: string): Promise<void> {
    try {
      this.loggerService.trace("addConversationToTeam called", { teamId, conversationId }, this.constructor.name);

      const teamConversationRelationship: RawEntity<TeamConversationRelationship> = {
        pk: teamId,
        sk: conversationId,
        type: EntityType.TeamConversationRelationship,
        teamId,
        conversationId,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: teamConversationRelationship,
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in addConversationToTeam", { error, teamId, conversationId }, this.constructor.name);

      throw error;
    }
  }

  public async removeConversationFromTeam(teamId: string, conversationId: string): Promise<void> {
    try {
      this.loggerService.trace("removeConversationFromTeam called", { teamId, conversationId }, this.constructor.name);

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: teamId, sk: conversationId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in removeConversationFromTeam", { error, teamId, conversationId }, this.constructor.name);

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
  createTeam(team: Omit<Team, "id">): Promise<Team>;
  addUserToTeam(teamId: string, userId: string, role: Role): Promise<void>;
  removeUserFromTeam(teamId: string, userId: string): Promise<void>;
  getTeamUserRelationship(teamId: string, userId: string): Promise<TeamUserRelationship>;
  addConversationToTeam(teamId: string, conversationId: string): Promise<void>;
  removeConversationFromTeam(teamId: string, conversationId: string): Promise<void>;
  getTeamsByUserId(teamId: string, exclusiveStartKey?: string): Promise<{ teams: WithRole<Team>[]; lastEvaluatedKey?: string }>;
}

type TeamRepositoryConfigType = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;
