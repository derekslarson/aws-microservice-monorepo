/* eslint-disable no-nested-ternary */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, DynamoSetValues, Role } from "@yac/core";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { ConversationType } from "../types/conversationType.type";
import { ConversationType as ConversationTypeEnum } from "../enums/conversationType.enum";
import { ConversationId } from "../types/conversationId.type";
import { UserId } from "../types/userId.type";
import { MessageId } from "../types/messageId.type";
import { ConversationFetchType } from "../enums/conversationFetchType.enum";

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

  public async createConversationUserRelationship<T extends ConversationType>(params: CreateConversationUserRelationshipInput<T>): Promise<CreateConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("createConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationUserRelationship } = params;

      const { unreadMessages, ...restOfConversationUserRelationship } = conversationUserRelationship;

      const conversationUserRelationshipEntity: RawConversationUserRelationship<T> = {
        entityType: EntityType.ConversationUserRelationship,
        pk: conversationUserRelationship.conversationId,
        sk: conversationUserRelationship.userId,
        gsi1pk: conversationUserRelationship.userId,
        gsi1sk: `${KeyPrefix.Time}${conversationUserRelationship.updatedAt}`,
        gsi2pk: conversationUserRelationship.userId,
        gsi2sk: `${this.getGsi2skPrefixById(conversationUserRelationship.conversationId)}${conversationUserRelationship.updatedAt}`,
        gsi3pk: conversationUserRelationship.dueDate ? conversationUserRelationship.userId : undefined,
        gsi3sk: conversationUserRelationship.dueDate ? `${KeyPrefix.Time}${conversationUserRelationship.dueDate}` : undefined,
        unreadMessages: unreadMessages && this.documentClient.createSet(unreadMessages),
        ...restOfConversationUserRelationship,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: conversationUserRelationshipEntity,
      }).promise();

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationUserRelationship<T extends ConversationId>(params: GetConversationUserRelationshipInput<T>): Promise<GetConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("getConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      const conversationUserRelationshipWithSet = await this.get<ConversationUserRelationshipWithSet<ConversationType<T>>>({ Key: { pk: conversationId, sk: userId } }, "Conversation-User Relationship");

      const conversationUserRelationship = this.cleanseSet(conversationUserRelationshipWithSet);

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addMessageToConversationUserRelationship<T extends ConversationId>(params: AddMessageToConversationUserRelationshipInput<T>): Promise<AddMessageToConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("addUnreadMessageToConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId, sender, updateUpdatedAt } = params;

      if (sender && !updateUpdatedAt) {
        // nothing to update, just return
        const { conversationUserRelationship } = await this.getConversationUserRelationship({ conversationId, userId });

        return { conversationUserRelationship };
      }

      const timestamp = new Date().toISOString();

      const conversationUserRelationshipWithSetUpdated = await this.update<ConversationUserRelationshipWithSet<ConversationType<T>>>({
        Key: {
          pk: conversationId,
          sk: userId,
        },
        UpdateExpression: `${updateUpdatedAt ? "SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp, #gsi2sk = :keyTimestampTwo" : ""}${sender ? "" : " ADD #unreadMessages :messageIdSet"}`,
        ExpressionAttributeNames: {
          ...(updateUpdatedAt && {
            "#updatedAt": "updatedAt",
            "#gsi1sk": "gsi1sk",
            "#gsi2sk": "gsi2sk",
          }),
          ...(!sender && { "#unreadMessages": "unreadMessages" }),
        },
        ExpressionAttributeValues: {
          ...(updateUpdatedAt && {
            ":timestamp": timestamp,
            ":keyTimestamp": `${KeyPrefix.Time}${timestamp}`,
            ":keyTimestampTwo": `${this.getGsi2skPrefixById(conversationId)}${timestamp}`,
          }),
          ...(!sender && { ":messageIdSet": this.documentClient.createSet([ messageId ]) }),
        },
      });

      const conversationUserRelationshipUpdated = this.cleanseSet(conversationUserRelationshipWithSetUpdated);

      return { conversationUserRelationship: conversationUserRelationshipUpdated };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUnreadMessageToConversationUserRelationship", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUnreadMessageFromConversationUserRelationship<T extends ConversationId>(params: RemoveUnreadMessageFromConversationUserRelationshipInput<T>): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput<T>> {
    try {
      this.loggerService.trace("removeUnreadMessageFromConversationUserRelationship called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const conversationUserRelationshipWithSet = await this.update<ConversationUserRelationshipWithSet<ConversationType<T>>>({
        Key: {
          pk: conversationId,
          sk: userId,
        },
        UpdateExpression: "DELETE #unreadMessages :messageIdSet",
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

  public async getConversationUserRelationshipsByConversationId<T extends ConversationId>(params: GetConversationUserRelationshipsByConversationIdInput<T>): Promise<GetConversationUserRelationshipsByConversationIdOutput<T>> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey, limit } = params;

      const { Items: conversationUserRelationshipsWithSet, LastEvaluatedKey } = await this.query<ConversationUserRelationshipWithSet<ConversationType<T>>>({
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

  public async getConversationUserRelationshipsByUserId<T extends ConversationFetchType>(params: GetConversationUserRelationshipsByUserIdInput<T>): Promise<GetConversationUserRelationshipsByUserIdOutput<T>> {
    try {
      this.loggerService.trace("getConversationUserRelationshipsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, type, unread, limit } = params;

      const indexName = type === "meeting_due_date" ? this.gsiThreeIndexName : type ? this.gsiTwoIndexName : this.gsiOneIndexName;
      const pk = type === "meeting_due_date" ? "gsi3pk" : type ? "gsi2pk" : "gsi1pk";
      const sk = type === "meeting_due_date" ? "gsi3sk" : type ? "gsi2sk" : "gsi1sk";
      const skPrefix = type === "meeting_due_date" || !type ? KeyPrefix.Time : this.getGsi2skPrefixByType(type);

      const { Items: conversationUserRelationshipsWithSet, LastEvaluatedKey } = await this.query<ConversationUserRelationshipWithSet<ConversationFetchTypeToConversationType<T>>>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        ...(unread && { FilterExpression: "attribute_exists(unreadMessages)" }),
        ScanIndexForward: type === "meeting_due_date",
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

  private getGsi2skPrefixByType(conversationType: ConversationFetchType): Gsi2skPrefix {
    try {
      this.loggerService.trace("getGsi2skPrefixByType called", { conversationType }, this.constructor.name);

      if (conversationType === ConversationFetchType.Friend) {
        return `${KeyPrefix.Time}${KeyPrefix.FriendConversation}` as Gsi2skPrefix;
      }

      if (conversationType === ConversationFetchType.Group) {
        return `${KeyPrefix.Time}${KeyPrefix.GroupConversation}` as Gsi2skPrefix;
      }

      return `${KeyPrefix.Time}${KeyPrefix.MeetingConversation}` as Gsi2skPrefix;
    } catch (error: unknown) {
      this.loggerService.error("Error in getGsi2skPrefixByType", { error, conversationType }, this.constructor.name);

      throw error;
    }
  }

  private cleanseSet<T extends ConversationType>(conversationUserRelationshipWithSet: ConversationUserRelationshipWithSet<T>): ConversationUserRelationship<T> {
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
  createConversationUserRelationship<T extends ConversationType>(params: CreateConversationUserRelationshipInput<T>): Promise<CreateConversationUserRelationshipOutput<T>>;
  getConversationUserRelationship<T extends ConversationId>(params: GetConversationUserRelationshipInput<T>): Promise<GetConversationUserRelationshipOutput<T>>;
  addMessageToConversationUserRelationship<T extends ConversationId>(params: AddMessageToConversationUserRelationshipInput<T>): Promise<AddMessageToConversationUserRelationshipOutput<T>>;
  removeUnreadMessageFromConversationUserRelationship<T extends ConversationId>(params: RemoveUnreadMessageFromConversationUserRelationshipInput<T>): Promise<RemoveUnreadMessageFromConversationUserRelationshipOutput<T>>;
  deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput>;
  getConversationUserRelationshipsByConversationId<T extends ConversationId>(params: GetConversationUserRelationshipsByConversationIdInput<T>): Promise<GetConversationUserRelationshipsByConversationIdOutput<T>>;
  getConversationUserRelationshipsByUserId<T extends ConversationFetchType>(params: GetConversationUserRelationshipsByUserIdInput<T>): Promise<GetConversationUserRelationshipsByUserIdOutput<T>>;
}

type ConversationUserRelationshipConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface ConversationUserRelationship<T extends ConversationType> {
  type: T;
  conversationId: ConversationId<T>;
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

export interface RawConversationUserRelationship<T extends ConversationType> extends Omit<ConversationUserRelationship<T>, "unreadMessages"> {
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
  unreadMessages?: DynamoDB.DocumentClient.DynamoDbSet;
}

export interface CreateConversationUserRelationshipInput<T extends ConversationType> {
  conversationUserRelationship: ConversationUserRelationship<T>;
}

export interface CreateConversationUserRelationshipOutput<T extends ConversationType> {
  conversationUserRelationship: ConversationUserRelationship<T>;
}

export interface GetConversationUserRelationshipInput<T extends ConversationId> {
  conversationId: T;
  userId: UserId;
}

export interface GetConversationUserRelationshipOutput<T extends ConversationId> {
  conversationUserRelationship: ConversationUserRelationship<ConversationType<T>>;
}

export interface AddMessageToConversationUserRelationshipInput<T extends ConversationId> {
  conversationId: T;
  userId: UserId;
  messageId: MessageId;
  sender?: boolean;
  updateUpdatedAt?: boolean;
}

export interface AddMessageToConversationUserRelationshipOutput<T extends ConversationId> {
  conversationUserRelationship: ConversationUserRelationship<ConversationType<T>>;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipInput<T extends ConversationId> {
  conversationId: T;
  userId: UserId;
  messageId: MessageId;
}

export interface RemoveUnreadMessageFromConversationUserRelationshipOutput<T extends ConversationId> {
  conversationUserRelationship: ConversationUserRelationship<ConversationType<T>>;
}
export interface DeleteConversationUserRelationshipInput {
  conversationId: ConversationId;
  userId: UserId;
}

export type DeleteConversationUserRelationshipOutput = void;

export interface GetConversationUserRelationshipsByConversationIdInput<T extends ConversationId> {
  conversationId: T;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByConversationIdOutput<T extends ConversationId> {
  conversationUserRelationships: ConversationUserRelationship<ConversationType<T>>[];
  lastEvaluatedKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdInput<T extends ConversationFetchType> {
  userId: UserId;
  unread?: boolean;
  type?: T;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationUserRelationshipsByUserIdOutput<T extends ConversationFetchType> {
  conversationUserRelationships: ConversationUserRelationship<ConversationFetchTypeToConversationType<T>>[];
  lastEvaluatedKey?: string;
}

export type ConversationFetchTypeToConversationType<T extends ConversationFetchType> =
  T extends ConversationFetchType.Friend ? ConversationTypeEnum.Friend :
    T extends ConversationFetchType.Group ? ConversationTypeEnum.Group :
      T extends ConversationFetchType.Meeting ? ConversationTypeEnum.Meeting :
        T extends ConversationFetchType.MeetingDueDate ? ConversationTypeEnum.Meeting : ConversationType;

export type ConversationUserRelationshipWithSet<T extends ConversationType = ConversationType> = DynamoSetValues<ConversationUserRelationship<T>, "unreadMessages">;
