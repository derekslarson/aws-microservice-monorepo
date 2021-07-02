import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { RawEntity } from "../types/raw.entity.type";
import { ConversationType } from "../enums/conversationType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";

@injectable()
export class ConversationDynamoRepository extends BaseDynamoRepositoryV2<Conversation> implements ConversationRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ConversationRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createConversation(params: CreateConversationInput): Promise<CreateConversationOutput> {
    try {
      this.loggerService.trace("createConversation called", { params }, this.constructor.name);

      const { conversation } = params;

      const conversationEntity: RawEntity<Conversation> = {
        entityType: conversation.type === ConversationType.DM ? EntityType.DmConversation : EntityType.ChannelConversation,
        pk: conversation.id,
        sk: conversation.id,
        ...(conversation.teamId && { gsi1pk: conversation.teamId, gsi1sk: conversation.id }),
        ...conversation,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: conversationEntity,
      }).promise();

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversation(params: GetConversationInput): Promise<GetConversationOutput> {
    try {
      this.loggerService.trace("getConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      const conversation = await this.get({ Key: { pk: conversationId, sk: conversationId } });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversations(params: GetConversationsInput): Promise<GetConversationsOutput> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { conversationIds } = params;

      const conversations = await this.batchGet({ Keys: conversationIds.map((conversationId) => ({ pk: conversationId, sk: conversationId })) });

      return { conversations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey } = params;

      const { Items: conversations, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": teamId,
          ":conversation": KeyPrefix.Conversation,
        },
      });

      return {
        conversations,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversations", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationRepositoryInterface {
  createConversation(params: CreateConversationInput): Promise<CreateConversationOutput>;
  getConversation(params: GetConversationInput): Promise<GetConversationOutput>;
  getConversations(params: GetConversationsInput): Promise<GetConversationsOutput>;
  getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput>;
}

type ConversationRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Conversation {
  id: string;
  type: ConversationType;
  createdAt: string;
  teamId?: string;
}
export interface CreateConversationInput {
  conversation: Conversation;
}

export interface CreateConversationOutput {
  conversation: Conversation;
}
export interface GetConversationInput {
  conversationId: string;
}

export interface GetConversationOutput {
  conversation: Conversation;
}

export interface GetConversationsInput {
  conversationIds: string[];
}

export interface GetConversationsOutput {
  conversations: Conversation[];
}

export interface GetConversationsByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput {
  conversations: Conversation[];
  lastEvaluatedKey?: string;
}
