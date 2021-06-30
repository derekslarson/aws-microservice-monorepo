import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, DynamoSetValues } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { ConversationUserRelationship } from "../models/conversation.user.relationship.model";
import { RawEntity } from "../../../core/src/types/raw.entity.type";

@injectable()
export class ConversationUserRelationshipDynamoRepository extends BaseDynamoRepositoryV2<ConversationUserRelationshipWithSet> implements ConversationUserRelationshipRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ConversationUserRelationshipConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("createConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationUserRelationship } = params;

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
      this.loggerService.error("Error in createConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationship(params: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("getConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      const conversationUserRelationshipWithSet = await this.get({ Key: { pk: conversationId, sk: userId } }, "Conversation-User Relationship");

      const conversationUserRelationship = this.cleanseSet(conversationUserRelationshipWithSet);

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUnreadMessageToConversationUserRelationship(params: AddUnreadMessageToConversationUserRelationshipInput): Promise<AddUnreadMessageToConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("addUnreadMessageToConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const timestamp = new Date().toISOString();

      const conversationUserRelationshipWithSet = await this.update({
        Key: {
          pk: conversationId,
          sk: userId,
        },
        UpdateExpression: "SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp ADD #unreadMessages = :messageIdSet",
        ExpressionAttributeNames: {
          "#updatedAt": "updatedAt",
          "#gsi1sk": "gsi1sk",
          "#unreadMessages": "unreadMessages",
        },
        ExpressionAttributeValues: {
          ":timestamp": timestamp,
          ":keyTimestamp": `${KeyPrefix.Time}${timestamp}`,
          ":messageIdSet": this.documentClient.createSet([ messageId ]),
        },
      });

      const conversationUserRelationship = this.cleanseSet(conversationUserRelationshipWithSet);

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUnreadMessageToConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUnreadMessageFromConversationUserRelationship(params: AddUnreadMessageToConversationUserRelationshipInput): Promise<AddUnreadMessageToConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("removeUnreadMessageFromConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const conversationUserRelationshipWithSet = await this.update({
        Key: {
          pk: conversationId,
          sk: userId,
        },
        UpdateExpression: "DELETE #unreadMessages = :messageIdSet",
        ExpressionAttributeNames: { "#unreadMessages": "unreadMessages" },
        ExpressionAttributeValues: { ":messageIdSet": this.documentClient.createSet([ messageId ]) },
      });

      const conversationUserRelationship = this.cleanseSet(conversationUserRelationshipWithSet);

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUnreadMessageFromConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateConversationUserRelationshipUpdatedAt(params: UpdateConversationUserRelationshipUpdatedAtInput): Promise<UpdateConversationUserRelationshipUpdatedAtOutput> {
    try {
      this.loggerService.trace("updateConversationUserRelationshipUpdatedAt called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      const timestamp = new Date().toISOString();

      const conversationUserRelationshipWithSet = await this.update({
        Key: {
          pk: conversationId,
          sk: userId,
        },
        UpdateExpression: "SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp",
        ExpressionAttributeNames: {
          "#updatedAt": "updatedAt",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":timestamp": timestamp,
          ":keyTimestamp": `${KeyPrefix.Time}${timestamp}`,
        },
      });

      const conversationUserRelationship = this.cleanseSet(conversationUserRelationshipWithSet);

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversationUserRelationshipUpdatedAt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("deleteConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: conversationId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationshipsByConversationId(params: GetConversationUserRelationshipsByConversationIdInput): Promise<GetConversationUserRelationshipsByConversationIdOutput> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey } = params;

      const { Items: conversationUserRelationshipsWithSet, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": conversationId,
          ":user": KeyPrefix.User,
        },
      });

      const conversationUserRelationships = conversationUserRelationshipsWithSet.map((conversationUserRelationship) => this.cleanseSet(conversationUserRelationship));

      return {
        conversationUserRelationships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationshipsByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationshipsByUserId(params: GetConversationUserRelationshipsByUserIdInput): Promise<GetConversationUserRelationshipsByUserIdOutput> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey } = params;

      const { Items: conversationUserRelationshipsWithSet, LastEvaluatedKey } = await this.query({
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

      const conversationUserRelationships = conversationUserRelationshipsWithSet.map((conversationUserRelationship) => this.cleanseSet(conversationUserRelationship));

      return {
        conversationUserRelationships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationshipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private cleanseSet(conversationUserRelationshipWithSet: ConversationUserRelationshipWithSet): ConversationUserRelationship {
    try {
      this.loggerService.trace("cleanseSet called", { conversationUserRelationshipWithSet }, this.constructor.name);

      const { unreadMessages, ...rest } = conversationUserRelationshipWithSet;

      return {
        ...rest,
        ...(unreadMessages && { unreadMessages: unreadMessages.values }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanseSet", { error, conversationUserRelationshipWithSet }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationUserRelationshipRepositoryInterface {
  createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput>;
  getConversationUserRelationship(params: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput>;
  addUnreadMessageToConversationUserRelationship(params: AddUnreadMessageToConversationUserRelationshipInput): Promise<AddUnreadMessageToConversationUserRelationshipOutput>;
  removeUnreadMessageFromConversationUserRelationship(params: RemoveUnreadMessageFromConversationUserRelationshipInput): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput>;
  updateConversationUserRelationshipUpdatedAt(params: UpdateConversationUserRelationshipUpdatedAtInput): Promise<UpdateConversationUserRelationshipUpdatedAtOutput>;
  deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput>;
  getConversationUserRelationshipsByConversationId(params: GetConversationUserRelationshipsByConversationIdInput): Promise<GetConversationUserRelationshipsByConversationIdOutput>;
  getConversationUserRelationshipsByUserId(params: GetConversationUserRelationshipsByUserIdInput): Promise<GetConversationUserRelationshipsByUserIdOutput>;
}

type ConversationUserRelationshipWithSet = DynamoSetValues<ConversationUserRelationship, "unreadMessages">;

type ConversationUserRelationshipConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

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

export interface AddUnreadMessageToConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
  messageId: string;
}

export interface AddUnreadMessageToConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
  messageId: string;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface UpdateConversationUserRelationshipUpdatedAtInput {
  conversationId: string;
  userId: string;
}

export interface UpdateConversationUserRelationshipUpdatedAtOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface DeleteConversationUserRelationshipInput {
  conversationId: string;
  userId: string;
}

export type DeleteConversationUserRelationshipOutput = void;

export interface GetConversationUserRelationshipsByConversationIdInput {
  conversationId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByConversationIdOutput {
  conversationUserRelationships: ConversationUserRelationship[];
  lastEvaluatedKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdOutput {
  conversationUserRelationships: ConversationUserRelationship[];
  lastEvaluatedKey?: string;
}
