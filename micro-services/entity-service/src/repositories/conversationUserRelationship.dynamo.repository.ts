/* eslint-disable no-nested-ternary */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, DynamoSetValues, Role } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { ConversationType } from "../enums/conversationType.enum";
import { ConversationId } from "../types/conversationId.type";
import { UserId } from "../types/userId.type";
import { MessageId } from "../types/messageId.type";

@injectable()
export class ConversationUserRelationshipDynamoRepository extends BaseDynamoRepositoryV2<ConversationUserRelationshipWithSet> implements ConversationUserRelationshipRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  private gsiThreeIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ConversationUserRelationshipConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
    this.gsiThreeIndexName = envConfig.globalSecondaryIndexNames.three;
  }

  public async createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("createConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationUserRelationship } = params;

      const conversationUserRelationshipEntity: RawConversationUserRelationship = {
        entityType: EntityType.ConversationUserRelationship,
        pk: conversationUserRelationship.conversationId,
        sk: conversationUserRelationship.userId,
        gsi1pk: conversationUserRelationship.userId,
        gsi1sk: `${KeyPrefix.Time}${conversationUserRelationship.updatedAt}` as Gsi1sk,
        gsi2pk: conversationUserRelationship.userId,
        gsi2sk: `${this.getGsi2skPrefixById(conversationUserRelationship.conversationId)}${conversationUserRelationship.updatedAt}` as Gsi2sk,
        gsi3pk: conversationUserRelationship.dueDate ? conversationUserRelationship.userId : undefined,
        gsi3sk: conversationUserRelationship.dueDate ? `${KeyPrefix.Time}${conversationUserRelationship.dueDate}` as Gsi3sk : undefined,
        ...conversationUserRelationship,
      };

      await this.documentClient.put({
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
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

  public async addMessageToConversationUserRelationship(params: AddMessageToConversationUserRelationshipInput): Promise<AddMessageToConversationUserRelationshipOutput> {
    try {
      this.loggerService.trace("addUnreadMessageToConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId, sender } = params;

      const timestamp = new Date().toISOString();

      const conversationUserRelationshipWithSet = await this.update({
        Key: {
          pk: conversationId,
          sk: userId,
        },
        UpdateExpression: `SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp, #gsi2sk = :keyTimestampTwo${sender ? "" : " ADD #unreadMessages = :messageIdSet"}`,
        ExpressionAttributeNames: {
          "#updatedAt": "updatedAt",
          "#gsi1sk": "gsi1sk",
          "#gsi2sk": "gsi2sk",
          ...(!sender && { "#unreadMessages": "unreadMessages" }),
        },
        ExpressionAttributeValues: {
          ":timestamp": timestamp,
          ":keyTimestamp": `${KeyPrefix.Time}${timestamp}`,
          ":keyTimestampTwo": `${this.getGsi2skPrefixById(conversationId)}${timestamp}`,
          ...(!sender && { ":messageIdSet": this.documentClient.createSet([ messageId ]) }),
        },
      });

      const conversationUserRelationship = this.cleanseSet(conversationUserRelationshipWithSet);

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUnreadMessageToConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUnreadMessageFromConversationUserRelationship(params: RemoveUnreadMessageFromConversationUserRelationshipInput): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput> {
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

      const { conversationId, exclusiveStartKey, limit } = params;

      const { Items: conversationUserRelationshipsWithSet, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
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

      const { userId, exclusiveStartKey, type, unread, limit } = params;

      const indexName = type === "due_date" ? this.gsiThreeIndexName : type ? this.gsiTwoIndexName : this.gsiOneIndexName;
      const pk = type === "due_date" ? "gsi3pk" : type ? "gsi2pk" : "gsi1pk";
      const sk = type === "due_date" ? "gsi3sk" : type ? "gsi2sk" : "gsi1sk";
      const skPrefix = type === "due_date" || !type ? KeyPrefix.Time : this.getGsi2skPrefixByType(type);

      const { Items: conversationUserRelationshipsWithSet, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        ...(unread && { FilterExpression: "attribute_exists(unreadMessages)" }),
        ScanIndexForward: false,
        Limit: limit ?? 25,
        IndexName: indexName,
        KeyConditionExpression: `#${pk} = :${pk} AND begins_with(#${sk}, :skPrefix)`,
        ExpressionAttributeNames: {
          [`#${pk}`]: pk,
          [`#${sk}`]: sk,
        },
        ExpressionAttributeValues: {
          [`:${pk}`]: userId,
          ":skPrefix": skPrefix,
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

  private getGsi2skPrefixById(conversationId: string): Gsi2skPrefix {
    try {
      this.loggerService.trace("getGsi2skPrefixById called", { conversationId }, this.constructor.name);

      if (conversationId.startsWith(KeyPrefix.FriendConversation)) {
        return `${KeyPrefix.Time}${KeyPrefix.FriendConversation}` as Gsi2skPrefix;
      }

      if (conversationId.startsWith(KeyPrefix.GroupConversation)) {
        return `${KeyPrefix.Time}${KeyPrefix.GroupConversation}` as Gsi2skPrefix;
      }

      return `${KeyPrefix.Time}${KeyPrefix.MeetingConversation}` as Gsi2skPrefix;
    } catch (error: unknown) {
      this.loggerService.error("Error in getGsi2skPrefixById", { error, conversationId }, this.constructor.name);

      throw error;
    }
  }

  private getGsi2skPrefixByType(conversationType: ConversationType): Gsi2skPrefix {
    try {
      this.loggerService.trace("getGsi2skPrefixByType called", { conversationType }, this.constructor.name);

      if (conversationType === ConversationType.Friend) {
        return `${KeyPrefix.Time}${KeyPrefix.FriendConversation}` as Gsi2skPrefix;
      }

      if (conversationType === ConversationType.Group) {
        return `${KeyPrefix.Time}${KeyPrefix.GroupConversation}` as Gsi2skPrefix;
      }

      return `${KeyPrefix.Time}${KeyPrefix.MeetingConversation}` as Gsi2skPrefix;
    } catch (error: unknown) {
      this.loggerService.error("Error in getGsi2skPrefixByType", { error, conversationType }, this.constructor.name);

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
  addMessageToConversationUserRelationship(params: AddMessageToConversationUserRelationshipInput): Promise<AddMessageToConversationUserRelationshipOutput>;
  removeUnreadMessageFromConversationUserRelationship(params: RemoveUnreadMessageFromConversationUserRelationshipInput): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput>;
  deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput>;
  getConversationUserRelationshipsByConversationId(params: GetConversationUserRelationshipsByConversationIdInput): Promise<GetConversationUserRelationshipsByConversationIdOutput>;
  getConversationUserRelationshipsByUserId(params: GetConversationUserRelationshipsByUserIdInput): Promise<GetConversationUserRelationshipsByUserIdOutput>;
}

type ConversationUserRelationshipWithSet = DynamoSetValues<ConversationUserRelationship, "unreadMessages">;

type ConversationUserRelationshipConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface ConversationUserRelationship {
  conversationId: ConversationId;
  userId: UserId;
  role: Role;
  muted: boolean;
  updatedAt: string;
  unreadMessages?: MessageId[];
  recentMessageId?: MessageId;
  dueDate?: string;
}

type Gsi1sk = `${KeyPrefix.Time}${string}`;
type Gsi2skPrefix = `${KeyPrefix.Time}${KeyPrefix.FriendConversation | KeyPrefix.GroupConversation | KeyPrefix.MeetingConversation}`;
type Gsi2sk = `${Gsi2skPrefix}${string}`;
type Gsi3sk = `${KeyPrefix.Time}${string}`;

export interface RawConversationUserRelationship extends ConversationUserRelationship {
  entityType: EntityType.ConversationUserRelationship,
  pk: ConversationId;
  sk: UserId;
  // allows sorting by updatedAt of all conversations
  gsi1pk: UserId;
  gsi1sk: Gsi1sk;
  // allows sorting by updatedAt of specific conversation types
  gsi2pk: UserId;
  gsi2sk: Gsi2sk;
  // allows sorting by meeting dueDate
  gsi3pk?: UserId;
  gsi3sk?: Gsi3sk;
}

export interface CreateConversationUserRelationshipInput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface CreateConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface GetConversationUserRelationshipInput {
  conversationId: ConversationId;
  userId: UserId;
}

export interface GetConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}
export interface AddMessageToConversationUserRelationshipInput {
  conversationId: ConversationId;
  userId: UserId;
  messageId: MessageId;
  sender?: boolean;
}

export interface AddMessageToConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipInput {
  conversationId: ConversationId;
  userId: UserId;
  messageId: MessageId;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipOutput {
  conversationUserRelationship: ConversationUserRelationship;
}
export interface DeleteConversationUserRelationshipInput {
  conversationId: ConversationId;
  userId: UserId;
}

export type DeleteConversationUserRelationshipOutput = void;

export interface GetConversationUserRelationshipsByConversationIdInput {
  conversationId: ConversationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByConversationIdOutput {
  conversationUserRelationships: ConversationUserRelationship[];
  lastEvaluatedKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdInput {
  userId: UserId;
  unread?: boolean;
  type?: ConversationType | "due_date";
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdOutput {
  conversationUserRelationships: ConversationUserRelationship[];
  lastEvaluatedKey?: string;
}
