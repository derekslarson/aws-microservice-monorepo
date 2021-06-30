import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { TeamConversationRelationship } from "../models/team.conversation.relationship.model";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { RawEntity } from "../../../core/src/types/raw.entity.type";

@injectable()
export class TeamConversationRelationshipDynamoRepository extends BaseDynamoRepositoryV2<TeamConversationRelationship> implements TeamConversationRelationshipRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: TeamConversationRelationshipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createTeamConversationRelationship(params: CreateTeamConversationRelationshipInput): Promise<CreateTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("createTeamConversationRelationship called", { params }, this.constructor.name);

      const { teamConversationRelationship } = params;

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
      this.loggerService.error("Error in createTeamConversationRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamConversationRelationship(params: GetTeamConversationRelationshipInput): Promise<GetTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("getTeamConversationRelationship called", { params }, this.constructor.name);

      const { teamId, conversationId } = params;

      const teamConversationRelationship = await this.get({ Key: { pk: teamId, sk: conversationId } }, "Team-Conversation Relationship");

      return { teamConversationRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamConversationRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteTeamConversationRelationship(params: DeleteTeamConversationRelationshipInput): Promise<DeleteTeamConversationRelationshipOutput> {
    try {
      this.loggerService.trace("deleteTeamConversationRelationship called", { params }, this.constructor.name);

      const { teamId, conversationId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: teamId, sk: conversationId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteTeamConversationRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamConversationRelationshipsByTeamId(params: GetTeamConversationRelationshipsByTeamIdInput): Promise<GetTeamConversationRelationshipsByTeamIdOutput> {
    try {
      this.loggerService.trace("getTeamConversationRelationshipsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey } = params;

      const { Items: teamConversationRelationships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :conversation)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": teamId,
          ":conversation": KeyPrefix.Conversation,
        },
      });

      return {
        teamConversationRelationships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamConversationRelationshipRepositoryInterface {
  createTeamConversationRelationship(params: CreateTeamConversationRelationshipInput): Promise<CreateTeamConversationRelationshipOutput>;
  getTeamConversationRelationship(params: GetTeamConversationRelationshipInput): Promise<GetTeamConversationRelationshipOutput>;
  deleteTeamConversationRelationship(params: DeleteTeamConversationRelationshipInput): Promise<DeleteTeamConversationRelationshipOutput>;
  getTeamConversationRelationshipsByTeamId(params: GetTeamConversationRelationshipsByTeamIdInput): Promise<GetTeamConversationRelationshipsByTeamIdOutput>
}

type TeamConversationRelationshipRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface CreateTeamConversationRelationshipInput {
  teamConversationRelationship: TeamConversationRelationship;
}

export interface CreateTeamConversationRelationshipOutput {
  teamConversationRelationship: TeamConversationRelationship;
}

export interface GetTeamConversationRelationshipInput {
  teamId: string;
  conversationId: string;
}

export interface GetTeamConversationRelationshipOutput {
  teamConversationRelationship: TeamConversationRelationship;
}

export interface DeleteTeamConversationRelationshipInput {
  teamId: string;
  conversationId: string;
}

export type DeleteTeamConversationRelationshipOutput = void;

export interface GetTeamConversationRelationshipsByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetTeamConversationRelationshipsByTeamIdOutput {
  teamConversationRelationships: TeamConversationRelationship[];
  lastEvaluatedKey?: string;
}
