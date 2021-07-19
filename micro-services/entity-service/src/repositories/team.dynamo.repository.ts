import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
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

      const teamEntity: RawTeam = {
        entityType: EntityType.Team,
        pk: team.id,
        sk: team.id,
        ...team,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: teamEntity,
      }).promise();

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

      const team = await this.get({ Key: { pk: teamId, sk: teamId } }, "Team");

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

export interface RawTeam extends Team {
  entityType: EntityType.Team,
  pk: TeamId;
  sk: TeamId;
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
