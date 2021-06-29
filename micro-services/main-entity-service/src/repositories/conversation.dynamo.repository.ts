import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, Role, WithRole, DynamoSetValues } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { ChannelConversation, Conversation, DmConversation } from "../models/conversation/conversation.model";
import { EntityType } from "../enums/entityType.enum";
import { ConversationType } from "../enums/conversationType.enum";
import { ConversationUserRelationship } from "../models/conversation/conversation.user.relationship.model";
import { TeamConversationRelationship } from "../models/team/team.conversation.relationship.model";

@injectable()
export class ConversationDynamoRepository extends BaseDynamoRepositoryV2 implements ConversationRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ConversationRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createDmConversation(userIdA: string, userIdB: string): Promise<DmConversation> {
    try {
      this.loggerService.trace("createDmConversation called", { userIdA, userIdB }, this.constructor.name);

      const id = `${KeyPrefix.DmConversation}${[ userIdA, userIdB ].sort().join("-")}`;

      const conversationEntity: RawEntity<DmConversation> = {
        type: EntityType.DmConversation,
        pk: id,
        sk: id,
        id,
        conversationType: ConversationType.DM,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: conversationEntity,
      }).promise();

      await Promise.all([ userIdA, userIdB ].map((userId) => this.addUserToConversation(id, userId, Role.Admin)));

      return this.cleanse(conversationEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createDmConversation", { error, userIdA, userIdB }, this.constructor.name);

      throw error;
    }
  }

  public async createChannelConversation(conversation: Omit<ChannelConversation, "id">): Promise<ChannelConversation> {
    try {
      this.loggerService.trace("createConversation called", { conversation }, this.constructor.name);

      const id = `${KeyPrefix.ChannelConversation}${this.idService.generateId()}`;

      const conversationEntity: RawEntity<ChannelConversation> = {
        type: EntityType.ChannelConversation,
        pk: id,
        sk: id,
        id,
        ...conversation,
      };

      await Promise.all([
        this.documentClient.put({ TableName: this.tableName, Item: conversationEntity }).promise(),
        this.addUserToConversation(id, conversation.createdBy, Role.Admin),
      ]);

      return this.cleanse(conversationEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversation", { error, conversation }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToConversation(conversationId: string, userId: string, role: Role): Promise<void> {
    try {
      this.loggerService.trace("addUserToConversation called", { conversationId, userId, role }, this.constructor.name);

      const timestamp = new Date().toISOString();

      const conversationUserRelationship: RawEntity<ConversationUserRelationship> = {
        pk: conversationId,
        sk: userId,
        gsi1pk: userId,
        gsi1sk: `${KeyPrefix.Time}${timestamp}`,
        type: EntityType.ConversationUserRelationship,
        conversationId,
        userId,
        role,
        muted: false,
        updatedAt: timestamp,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: conversationUserRelationship,
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToConversation", { error, conversationId, userId, role }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationship(conversationId: string, userId: string): Promise<ConversationUserRelationship> {
    try {
      this.loggerService.trace("getConversationUserRelationship called", { conversationId, userId }, this.constructor.name);

      const { unreadMessages, ...rest } = await this.get<DynamoSetValues<ConversationUserRelationship, "unreadMessages">>({ Key: { pk: conversationId, sk: userId } }, "Conversation-User Relationship");

      return {
        ...rest,
        ...(unreadMessages && { unreadMessages: unreadMessages.values }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationship", { error, conversationId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async updateConversationUserRelationship(conversationId: string, userId: string, update: Partial<ConversationUserRelationship>): Promise<ConversationUserRelationship> {
    try {
      this.loggerService.trace("updateConversationUserRelationship called", { conversationId, userId, update }, this.constructor.name);

      const { unreadMessages, ...rest } = await this.partialUpdate<ConversationUserRelationship>(conversationId, userId, update) as DynamoSetValues<ConversationUserRelationship, "unreadMessages">;

      return {
        ...rest,
        ...(unreadMessages && { unreadMessages: unreadMessages.values }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversationUserRelationship", { error, conversationId, userId, update }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromConversation(conversationId: string, userId: string): Promise<void> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { conversationId, userId }, this.constructor.name);

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: conversationId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, conversationId, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<Conversation>[], lastEvaluatedKey?: string; }> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { userId }, this.constructor.name);

      const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :time)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": userId,
          ":time": KeyPrefix.Time,
        },
      });

      const conversations = await this.batchGet<Conversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations<Conversation>(conversationUserRelationships, conversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getUnreadConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<Conversation>[], lastEvaluatedKey?: string; }> {
    try {
      this.loggerService.trace("getUnreadConversationsByUserId called", { userId }, this.constructor.name);

      const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        IndexName: this.gsiOneIndexName,
        FilterExpression: "attribute_exists(unreadMessages)",
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": userId,
          ":conversation": KeyPrefix.Conversation,
        },
      });

      const conversations = await this.batchGet<Conversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations(conversationUserRelationships, conversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUnreadConversationsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getDmConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<DmConversation>[], lastEvaluatedKey?: string; }> {
    try {
      this.loggerService.trace("getDmConversationsByUserId called", { userId }, this.constructor.name);

      const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": userId,
          ":conversation": KeyPrefix.DmConversation,
        },
      });

      const conversations = await this.batchGet<DmConversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations<DmConversation>(conversationUserRelationships, conversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getDmConversationsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getChannelConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<ChannelConversation>[]; lastEvaluatedKey?: string; }> {
    try {
      this.loggerService.trace("getChannelConversationsByUserId called", { userId }, this.constructor.name);

      const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": userId,
          ":conversation": KeyPrefix.ChannelConversation,
        },
      });

      const conversations = await this.batchGet<ChannelConversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations<ChannelConversation>(conversationUserRelationships, conversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getChannelConversationsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByTeamId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: Conversation[], lastEvaluatedKey?: string; }> {
    try {
      this.loggerService.trace("getConversationsByTeamId called", { userId }, this.constructor.name);

      const { Items: teamConversationRelationships, LastEvaluatedKey } = await this.query<TeamConversationRelationship>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :conversation)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": userId,
          ":conversation": KeyPrefix.Conversation,
        },
      });

      const conversations = await this.batchGet<Conversation>({ Keys: teamConversationRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      return {
        conversations,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  private addRoleToConversations<T extends Conversation = Conversation>(conversationUserRelationships: ConversationUserRelationship[], conversations: T[]): WithRole<T>[] {
    try {
      this.loggerService.trace("addRoleToConversations called", { conversationUserRelationships, conversations }, this.constructor.name);

      const conversationMap = conversations.reduce((acc: { [key: string]: T; }, conversation) => {
        acc[conversation.id] = conversation;

        return acc;
      }, {});

      const conversationsWithRole = conversationUserRelationships.map((relationship) => {
        const conversation = conversationMap[relationship.conversationId];

        return {
          ...conversation,
          role: relationship.role,
        };
      });

      return conversationsWithRole;
    } catch (error: unknown) {
      this.loggerService.error("Error in addRoleToConversations", { error, conversationUserRelationships, conversations }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationRepositoryInterface {
  createDmConversation(userIdA: string, userIdB: string): Promise<DmConversation>;
  createChannelConversation(conversation: Omit<ChannelConversation, "id">): Promise<ChannelConversation>
  addUserToConversation(conversationId: string, userId: string, role: Role): Promise<void>;
  removeUserFromConversation(conversationId: string, userId: string): Promise<void>;
  getConversationUserRelationship(conversationId: string, userId: string): Promise<ConversationUserRelationship>;
  updateConversationUserRelationship(conversationId: string, userId: string, update: Partial<ConversationUserRelationship>): Promise<ConversationUserRelationship>;
  getConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<Conversation>[], lastEvaluatedKey?: string; }>;
  getUnreadConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<Conversation>[], lastEvaluatedKey?: string; }>;
  getDmConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<DmConversation>[], lastEvaluatedKey?: string; }>;
  getChannelConversationsByUserId(userId: string, exclusiveStartKey?: string): Promise<{ conversations: WithRole<ChannelConversation>[]; lastEvaluatedKey?: string; }>;
  getConversationsByTeamId(teamId: string, exclusiveStartKey?: string): Promise<{ conversations: Conversation[], lastEvaluatedKey?: string; }>;
}

type ConversationRepositoryConfigType = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;
