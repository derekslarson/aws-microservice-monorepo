import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { Team } from "../models/team.model";
import { Role } from "../enums/role.enum";
import { TeamUserRelationship } from "../models/team.user.relationship.model";

@injectable()
export class TeamDynamoRepository extends BaseDynamoRepositoryV2<Team> implements TeamRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);
  }

  public async createTeam(team: Omit<Team, "id">): Promise<Team> {
    try {
      this.loggerService.trace("createTeam called", { team }, this.constructor.name);

      const id = `TEAM-${this.idService.generateId()}`;

      const teamEntity: RawEntity<Team> = {
        type: "TEAM",
        pk: id,
        sk: id,
        id,
        name: team.name,
        createdBy: team.createdBy,
      };

      await this.documentClient.transactWrite({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: teamEntity,
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: {
                pk: id,
                sk: team.createdBy,
                gsi1pk: team.createdBy,
                gsi1sk: id,
                type: "TEAM-USER-RELATIONSHIP",
                teamId: id,
                userId: team.createdBy,
                role: Role.Admin,
              },
            },
          },
        ],
      }).promise();

      return this.cleanse(teamEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, team }, this.constructor.name);

      throw error;
    }
  }

  public async createTeamUserRelationship(teamId: string, userId: string, role: Role): Promise<void> {
    try {
      this.loggerService.trace("createTeamUserRelationship called", { teamId, userId }, this.constructor.name);

      const teamMembership: RawEntity<TeamUserRelationship> = {
        pk: teamId,
        sk: userId,
        gsi1pk: userId,
        gsi1sk: teamId,
        type: "TEAM-USER-RELATIONSHIP",
        teamId,
        userId,
        role,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: teamMembership,
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeamUserRelationship", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationship(teamId: string, userId: string): Promise<TeamUserRelationship> {
    try {
      this.loggerService.trace("getTeamUserRelationship called", { teamId, userId }, this.constructor.name);

      const teamUserRelationship = await this.get<TeamUserRelationship>({
        TableName: this.tableName,
        Key: { pk: teamId, sk: userId },
      }, "Team-User Relationship");

      return teamUserRelationship;
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationship", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamUserRelationship(teamId: string, userId: string): Promise<void> {
    try {
      this.loggerService.trace("deleteTeamUserRelationship called", { teamId, userId }, this.constructor.name);

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: teamId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteTeamUserRelationship", { error, teamId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamUserRelationshipsByTeamId(teamId: string): Promise<TeamUserRelationship[]> {
    try {
      this.loggerService.trace("getTeamUserRelationshipsByTeamId called", { teamId }, this.constructor.name);

      const { Items: teamUserRelationships } = await this.query<TeamUserRelationship>({
        TableName: this.tableName,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": teamId,
          ":user": "USER-",
        },
      });

      return teamUserRelationships;
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationshipsByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamRepositoryInterface {
  createTeam(team: Omit<Team, "id">): Promise<Team>;
  createTeamUserRelationship(teamId: string, userId: string, role: Role): Promise<void>;
  getTeamUserRelationship(teamId: string, userId: string): Promise<TeamUserRelationship>;
  deleteTeamUserRelationship(teamId: string, userId: string): Promise<void>;
  getTeamUserRelationshipsByTeamId(teamId: string): Promise<TeamUserRelationship[]>;
}

type TeamRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;
