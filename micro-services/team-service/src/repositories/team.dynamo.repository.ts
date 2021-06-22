import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { Team } from "../models/team.model";

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

      const id = `TEAM#${this.idService.generateId()}`;

      const teamEntity: RawEntity<Team> = {
        type: "TEAM",
        pk: id,
        sk: id,
        id,
        name: team.name,
        createdBy: team.createdBy,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: teamEntity,
      }).promise();

      return this.cleanse(teamEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, team }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToTeam(teamId: string, userId: string): Promise<void> {
    try {
      this.loggerService.trace("addUserToTeam called", { teamId, userId }, this.constructor.name);

      const teamMembership = {
        pk: teamId,
        sk: userId,
        gsi1pk: userId,
        gsi1sk: teamId,
        type: "TEAM-MEMBERSHIP:USER",
        teamId,
        userId,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: teamMembership,
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, teamId, userId }, this.constructor.name);

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

  public async getUsersByTeamId(teamId: string): Promise<string[]> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { teamId }, this.constructor.name);

      const { Items = [] } = await this.documentClient.query({
        TableName: this.tableName,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": teamId,
          ":user": "USER#",
        },
      }).promise();

      const userIds = (Items as { userId: string; }[]).map((membership) => membership.userId);

      return userIds;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamRepositoryInterface {
  createTeam(team: Omit<Team, "id">): Promise<Team>;
  addUserToTeam(teamId: string, userId: string): Promise<void>;
  removeUserFromTeam(teamId: string, userId: string): Promise<void>;
  getUsersByTeamId(teamId: string): Promise<string[]>;
}

type TeamRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;
