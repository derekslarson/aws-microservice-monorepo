import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { RawEntity } from "../types/raw.entity.type";
import { TeamId } from "../types/teamId.type";
import { UserId } from "../types/userId.type";

@injectable()
export class TeamDynamoRepository extends BaseDynamoRepositoryV2<Team> implements TeamRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { team } = params;

      const teamEntity: RawEntity<Team> = {
        entityType: EntityType.Team,
        pk: team.id,
        sk: team.id,
        ...team,
      };

      await this.documentClient.put({ TableName: this.tableName, Item: teamEntity }).promise();

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeam(params: GetTeamInput): Promise<GetTeamOutput> {
    try {
      this.loggerService.trace("getTeam called", { params }, this.constructor.name);

      const { teamId } = params;

      const team = await this.get({ Key: { pk: teamId, sk: teamId } });

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeams(params: GetTeamsInput): Promise<GetTeamsOutput> {
    try {
      this.loggerService.trace("getTeams called", { params }, this.constructor.name);

      const { teamIds } = params;

      const teams = await this.batchGet({ Keys: teamIds.map((teamId) => ({ pk: teamId, sk: teamId })) });

      return { teams };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeams", { error, params }, this.constructor.name);

      throw error;
    }
  }

  // public async getTeamsByUserId(params: GetTeamsByUserIdInput): Promise<GetTeamsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getTeamsByUserId called", { params }, this.constructor.name);

  //     const { userId, exclusiveStartKey } = params;

  //     const { Items: teamUserRelationships, LastEvaluatedKey } = await this.query<TeamUserRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       IndexName: this.gsiOneIndexName,
  //       KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :team)",
  //       ExpressionAttributeNames: {
  //         "#gsi1pk": "gsi1pk",
  //         "#gsi1sk": "gsi1sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":gsi1pk": userId,
  //         ":team": KeyPrefix.Team,
  //       },
  //     });

  //     const teams = await this.batchGet<Team>({ Keys: teamUserRelationships.map((relationship) => ({ pk: relationship.teamId, sk: relationship.teamId })) });

  //     const teamsWithRole = this.addRoleToTeams(teamUserRelationships, teams);

  //     return {
  //       teams: teamsWithRole,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getTeamsByUserId", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async createTeamUserRelationship(params: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("createTeamUserRelationship called", { params }, this.constructor.name);

  //     const { teamUserRelationship } = params;

  //     const teamUserRelationshipEntity: RawEntity<TeamUserRelationship> = {
  //       type: EntityType.TeamUserRelationship,
  //       pk: teamUserRelationship.teamId,
  //       sk: teamUserRelationship.userId,
  //       gsi1pk: teamUserRelationship.userId,
  //       gsi1sk: teamUserRelationship.teamId,
  //       ...teamUserRelationship,
  //     };

  //     await this.documentClient.put({
  //       TableName: this.tableName,
  //       Item: teamUserRelationshipEntity,
  //     }).promise();

  //     return { teamUserRelationship };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in createTeamUserRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getTeamUserRelationship(params: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("getTeamUserRelationship called", { params }, this.constructor.name);

  //     const { teamId, userId } = params;

  //     const teamUserRelationship = await this.get<TeamUserRelationship>({ Key: { pk: teamId, sk: userId } }, "Team-User Relationship");

  //     return { teamUserRelationship };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getTeamUserRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async deleteTeamUserRelationship(params: DeleteTeamUserRelationshipInput): Promise<DeleteTeamUserRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("deleteTeamUserRelationship called", { params }, this.constructor.name);

  //     const { teamId, userId } = params;
  //     await this.documentClient.delete({
  //       TableName: this.tableName,
  //       Key: { pk: teamId, sk: userId },
  //     }).promise();
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in deleteTeamUserRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async createTeamConversationRelationship(params: CreateTeamConversationRelationshipInput): Promise<CreateTeamConversationRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("createTeamConversationRelationship called", { params }, this.constructor.name);

  //     const { teamConversationRelationship } = params;

  //     const teamConversationRelationshipEntity: RawEntity<TeamConversationRelationship> = {
  //       type: EntityType.TeamConversationRelationship,
  //       pk: teamConversationRelationship.teamId,
  //       sk: teamConversationRelationship.conversationId,
  //       ...teamConversationRelationship,
  //     };

  //     await this.documentClient.put({
  //       TableName: this.tableName,
  //       Item: teamConversationRelationshipEntity,
  //     }).promise();

  //     return { teamConversationRelationship };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in createTeamConversationRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async deleteTeamConversationRelationship(params: DeleteTeamConversationRelationshipInput): Promise<DeleteTeamConversationRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("deleteTeamConversationRelationship called", { params }, this.constructor.name);

  //     const { teamId, conversationId } = params;

  //     await this.documentClient.delete({
  //       TableName: this.tableName,
  //       Key: { pk: teamId, sk: conversationId },
  //     }).promise();
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in deleteTeamConversationRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // private addRoleToTeams(teamUserRelationships: TeamUserRelationship[], teams: Team[]): WithRole<Team>[] {
  //   try {
  //     this.loggerService.trace("addRoleToTeams called", { teamUserRelationships, teams }, this.constructor.name);

  //     const teamMap = teams.reduce((acc: { [key: string]: Team; }, team) => {
  //       acc[team.id] = team;

  //       return acc;
  //     }, {});

  //     const teamsWithRole = teamUserRelationships.map((relationship) => {
  //       const team = teamMap[relationship.teamId];

  //       return {
  //         ...team,
  //         role: relationship.role,
  //       };
  //     });

  //     return teamsWithRole;
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in addRoleToTeams", { error, teamUserRelationships, teams }, this.constructor.name);

  //     throw error;
  //   }
  // }
}

export interface TeamRepositoryInterface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  getTeams(params: GetTeamsInput): Promise<GetTeamsOutput>;
}

type TeamRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface Team {
  id: TeamId;
  createdBy: UserId;
  name: string;
}

export interface CreateTeamInput {
  team: Team;
}

export interface CreateTeamOutput {
  team: Team;
}

export interface GetTeamInput {
  teamId: TeamId;
}

export interface GetTeamOutput {
  team: Team;
}

export interface GetTeamsInput {
  teamIds: TeamId[];
}

export interface GetTeamsOutput {
  teams: Team[];
}
