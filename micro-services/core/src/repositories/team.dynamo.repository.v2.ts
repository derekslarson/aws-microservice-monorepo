import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { OrganizationId } from "./organization.dynamo.repository.v2";

@injectable()
export class TeamDynamoRepositoryV2 extends BaseDynamoRepositoryV2<Team> implements TeamRepositoryV2Interface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createTeam(params: CreateTeamInput): Promise<CreateTeamOutput> {
    try {
      this.loggerService.trace("createTeam called", { params }, this.constructor.name);

      const { team } = params;

      const teamEntity: RawTeam = {
        entityType: EntityTypeV2.Team,
        pk: team.id,
        sk: EntityTypeV2.Team,
        gsi1pk: team.organizationId,
        gsi1sk: `${KeyPrefixV2.Team}${KeyPrefixV2.Active}${team.activeAt}`,
        ...team,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
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

      const team = await this.get({ Key: { pk: teamId, sk: EntityTypeV2.Team } }, "Team");

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput> {
    try {
      this.loggerService.trace("updateTeam called", { params }, this.constructor.name);

      const { teamId, updates } = params;

      const team = await this.partialUpdate(teamId, EntityTypeV2.Team, updates);

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeams(params: GetTeamsInput): Promise<GetTeamsOutput> {
    try {
      this.loggerService.trace("getTeams called", { params }, this.constructor.name);

      const { teamIds } = params;

      const teams = await this.batchGet({ Keys: teamIds.map((teamId) => ({ pk: teamId, sk: EntityTypeV2.Team })) });

      return { teams };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeams", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsByOrganizationId(params: GetTeamsByOrganizationIdInput): Promise<GetTeamsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getTeamsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { Items: teams, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :organizationId AND begins_with(#gsi1sk, :teamActive)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":organizationId": organizationId,
          ":teamActive": `${KeyPrefixV2.Team}${KeyPrefixV2.Active}`,
        },
      });

      return {
        teams,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public convertRawTeamToTeam(params: ConvertRawTeamToTeamInput): ConvertRawTeamToTeamOutput {
    try {
      this.loggerService.trace("convertRawTeamToTeam called", { params }, this.constructor.name);

      const { rawTeam } = params;

      const team = this.cleanse(rawTeam);

      return { team };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertRawTeamToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamRepositoryV2Interface {
  createTeam(params: CreateTeamInput): Promise<CreateTeamOutput>;
  getTeam(params: GetTeamInput): Promise<GetTeamOutput>;
  getTeams(params: GetTeamsInput): Promise<GetTeamsOutput>;
  getTeamsByOrganizationId(params: GetTeamsByOrganizationIdInput): Promise<GetTeamsByOrganizationIdOutput>;
  updateTeam(params: UpdateTeamInput): Promise<UpdateTeamOutput>;
  convertRawTeamToTeam(params: ConvertRawTeamToTeamInput): ConvertRawTeamToTeamOutput;
}

type TeamRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Team {
  id: TeamId;
  organizationId: OrganizationId;
  imageMimeType: ImageMimeType;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeAt: string;
}

export interface RawTeam extends Team {
  entityType: EntityTypeV2.Team,
  pk: TeamId;
  sk: EntityTypeV2.Team;
  gsi1pk: OrganizationId;
  gsi1sk: `${KeyPrefixV2.Team}${KeyPrefixV2.Active}${string}`;
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

export interface GetTeamsByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsByOrganizationIdOutput {
  teams: Team[];
  lastEvaluatedKey?: string;
}

export type TeamUpdates = Partial<Pick<Team, "name" | "imageMimeType">>;

export interface UpdateTeamInput {
  teamId: TeamId;
  updates: TeamUpdates;
}

export interface UpdateTeamOutput {
  team: Team;
}

export interface GetTeamsInput {
  teamIds: TeamId[];
}

export interface GetTeamsOutput {
  teams: Team[];
}

export interface ConvertRawTeamToTeamInput {
  rawTeam: RawTeam;

}

export interface ConvertRawTeamToTeamOutput {
  team: Team;
}

export type TeamId = `${KeyPrefixV2.Team}${string}`;
