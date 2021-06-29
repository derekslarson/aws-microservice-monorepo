import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, WithRole, DynamoSetValues } from "@yac/core";
import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { ChannelConversation, Conversation, DmConversation } from "../models/conversation.model";
import { EntityType } from "../enums/entityType.enum";
import { TeamConversationRelationship } from "../models/team.conversation.relationship.model";
import { ConversationUserRelationship } from "../models/conversation.user.relationship.model";

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

  public async createDmConversation(createDmConversationInput: CreateDmConversationInput): Promise<CreateDmConversationOutput> {
    try {
      this.loggerService.trace("createDmConversation called", { createDmConversationInput }, this.constructor.name);

      const { conversation } = createDmConversationInput;

      const conversationEntity: RawEntity<DmConversation> = {
        type: EntityType.DmConversation,
        pk: conversation.id,
        sk: conversation.id,
        ...conversation,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: conversationEntity,
      }).promise();

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createDmConversation", { error, createDmConversationInput }, this.constructor.name);

      throw error;
    }
  }

  public async createChannelConversation(createChannelConversationInput: CreateChannelConversationInput): Promise<CreateChannelConversationOutput> {
    try {
      this.loggerService.trace("createConversation called", { createChannelConversationInput }, this.constructor.name);

      const { conversation } = createChannelConversationInput;

      const conversationEntity: RawEntity<ChannelConversation> = {
        type: EntityType.ChannelConversation,
        pk: conversation.id,
        sk: conversation.id,
        ...conversation,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: conversationEntity,
      }).promise();

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversation", { error, createChannelConversationInput }, this.constructor.name);

      throw error;
    }
  }

  public async createConversationUserRelationship(createConversationUserRelationshipInput: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("createConversationUserRelationship called", { createConversationUserRelationshipInput }, this.constructor.name);

      const { conversationUserRelationship } = createConversationUserRelationshipInput;

      const conversationUserRelationshipEntity: RawEntity<ConversationUserRelationship> = {
        pk: conversationUserRelationship.conversationId,
        sk: conversationUserRelationship.userId,
        gsi1pk: conversationUserRelationship.userId,
        gsi1sk: `${KeyPrefix.Time}${conversationUserRelationship.updatedAt}`,
        type: EntityType.ConversationUserRelationship,
        ...conversationUserRelationship,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: conversationUserRelationshipEntity,
      }).promise();

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversationUserRelationship", { error, createConversationUserRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationship(getConversationUserRelationshipInput: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("getConversationUserRelationship called", { getConversationUserRelationshipInput }, this.constructor.name);

      const { conversationId, userId } = getConversationUserRelationshipInput;

      const { unreadMessages, ...rest } = await this.get<DynamoSetValues<ConversationUserRelationship, "unreadMessages">>({ Key: { pk: conversationId, sk: userId } }, "Conversation-User Relationship");

      const conversationUserRelationship = {
        ...rest,
        ...(unreadMessages && { unreadMessages: unreadMessages.values }),
      };

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationship", { error, getConversationUserRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  public async deleteConversationUserRelationship(deleteConversationUserRelationshipInput: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("deleteConversationUserRelationship called", { deleteConversationUserRelationshipInput }, this.constructor.name);

      const { conversationId, userId } = deleteConversationUserRelationshipInput;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: conversationId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteConversationUserRelationship", { error, deleteConversationUserRelationshipInput }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByUserId(getConversationsByUserIdInput: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { getConversationsByUserIdInput }, this.constructor.name);

      const { userId, exclusiveStartKey } = getConversationsByUserIdInput;

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

      const unsortedConversations = await this.batchGet<Conversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations<Conversation>(conversationUserRelationships, unsortedConversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, getConversationsByUserIdInput }, this.constructor.name);

      throw error;
    }
  }

  public async getUnreadConversationsByUserId(getUnreadConversationsByUserIdInput: GetUnreadConversationsByUserIdInput): Promise<GetUnreadConversationsByUserIdOutput> {
    try {
      this.loggerService.trace("getUnreadConversationsByUserId called", { getUnreadConversationsByUserIdInput }, this.constructor.name);

      const { userId, exclusiveStartKey } = getUnreadConversationsByUserIdInput;

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

      const unsortedConversations = await this.batchGet<Conversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations(conversationUserRelationships, unsortedConversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUnreadConversationsByUserId", { error, getUnreadConversationsByUserIdInput }, this.constructor.name);

      throw error;
    }
  }

  public async getDmConversationsByUserId(getDmConversationsByUserIdInput: GetDmConversationsByUserIdInput): Promise<GetDmConversationsByUserIdOutput> {
    try {
      this.loggerService.trace("getDmConversationsByUserId called", { getDmConversationsByUserIdInput }, this.constructor.name);

      const { userId, exclusiveStartKey } = getDmConversationsByUserIdInput;

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

      const unsortedConversations = await this.batchGet<DmConversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations<DmConversation>(conversationUserRelationships, unsortedConversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getDmConversationsByUserId", { error, getDmConversationsByUserIdInput }, this.constructor.name);

      throw error;
    }
  }

  public async getChannelConversationsByUserId(getChannelConversationsByUserIdInput: GetChannelConversationsByUserIdInput): Promise<GetChannelConversationsByUserIdOutput> {
    try {
      this.loggerService.trace("getChannelConversationsByUserId called", { getChannelConversationsByUserIdInput }, this.constructor.name);

      const { userId, exclusiveStartKey } = getChannelConversationsByUserIdInput;

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

      const unsortedConversations = await this.batchGet<ChannelConversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

      const conversationsWithRole = this.addRoleToConversations<ChannelConversation>(conversationUserRelationships, unsortedConversations);

      return {
        conversations: conversationsWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getChannelConversationsByUserId", { error, getChannelConversationsByUserIdInput }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByTeamId(getConversationsByTeamIdInput: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput> {
    try {
      this.loggerService.trace("getConversationsByTeamId called", { getConversationsByTeamIdInput }, this.constructor.name);

      const { userId, exclusiveStartKey } = getConversationsByTeamIdInput;

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
      this.loggerService.error("Error in getConversationsByUserId", { error, getConversationsByTeamIdInput }, this.constructor.name);

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
  createDmConversation(createDmConversationInput: CreateDmConversationInput): Promise<CreateDmConversationOutput>;
  createChannelConversation(createChannelConversationInput: CreateChannelConversationInput): Promise<CreateChannelConversationOutput>;
  createConversationUserRelationship(createConversationUserRelationshipInput: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput>;
  getConversationUserRelationship(getConversationUserRelationshipInput: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput>;
  deleteConversationUserRelationship(deleteConversationUserRelationshipInput: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput>;
  getConversationsByUserId(getConversationsByUserIdInput: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
  getUnreadConversationsByUserId(getUnreadConversationsByUserIdInput: GetUnreadConversationsByUserIdInput): Promise<GetUnreadConversationsByUserIdOutput>;
  getDmConversationsByUserId(getDmConversationsByUserIdInput: GetDmConversationsByUserIdInput): Promise<GetDmConversationsByUserIdOutput>;
  getChannelConversationsByUserId(getChannelConversationsByUserIdInput: GetChannelConversationsByUserIdInput): Promise<GetChannelConversationsByUserIdOutput>;
  getConversationsByTeamId(getConversationsByTeamIdInput: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput>;
}

type ConversationRepositoryConfigType = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface CreateDmConversationInput {
  conversation: DmConversation;
}

export interface CreateDmConversationOutput {
  conversation: DmConversation;
}

export interface CreateChannelConversationInput {
  conversation: ChannelConversation;
}

export interface CreateChannelConversationOutput {
  conversation: ChannelConversation;
}

export interface CreateConversationUserRelationshipInput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface CreateConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface GetConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
}

export interface GetConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface DeleteConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
}

export type DeleteConversationUserRelationshipOutput = void;

export interface GetConversationsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationsByUserIdOutput {
  conversations: WithRole<Conversation>[];
  lastEvaluatedKey?: string;
}

export interface GetUnreadConversationsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetUnreadConversationsByUserIdOutput {
  conversations: WithRole<Conversation>[];
  lastEvaluatedKey?: string;
}

export interface GetDmConversationsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetDmConversationsByUserIdOutput {
  conversations: WithRole<DmConversation>[];
  lastEvaluatedKey?: string;
}

export interface GetChannelConversationsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetChannelConversationsByUserIdOutput {
  conversations: WithRole<ChannelConversation>[];
  lastEvaluatedKey?: string;
}

export interface GetConversationsByTeamIdInput {
  userId: string;
  exclusiveStartKey?: string;
}
export interface GetConversationsByTeamIdOutput {
  conversations: Conversation[];
  lastEvaluatedKey?: string;
}
