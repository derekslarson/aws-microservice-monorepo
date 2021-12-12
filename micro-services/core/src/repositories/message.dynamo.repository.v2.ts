/* eslint-disable import/no-cycle */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, CleansedEntity, DocumentClientFactory, LoggerServiceInterface, MessageMimeType, RawEntity } from "@yac/util";

import DynamoDB from "aws-sdk/clients/dynamodb";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { GroupId } from "./group.dynamo.repository";
import { MeetingId } from "./meeting.dynamo.repository";
import { UserId } from "./user.dynamo.repository.v2";
import { OneOnOneId } from "./oneOnOneMembership.dynamo.repository";

@injectable()
export class MessageDynamoRepository extends BaseDynamoRepositoryV2<Message> implements MessageRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
  }

  public async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { message } = params;

      const { reactions, ...restOfMessage } = message;

      const rawReactions: Record<string, DynamoDB.DocumentClient.DynamoDbSet> = {};
      Object.entries(reactions).forEach(([ reaction, userIds ]) => {
        rawReactions[reaction] = this.documentClient.createSet(userIds);
      });

      const messageEntity: RawMessage = {
        entityType: EntityTypeV2.Message,
        pk: message.id,
        sk: EntityTypeV2.Message,
        gsi1pk: message.replyTo ? `${KeyPrefixV2.ReplyTo}${message.replyTo}` : message.conversationId,
        gsi1sk: `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}${message.createdAt}`,
        gsi2pk: !message.replyTo && message.agenda ? `${KeyPrefixV2.Agenda}${message.agenda}_${message.conversationId}` : undefined,
        gsi2sk: `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}${message.createdAt}`,
        reactions: rawReactions,
        ...restOfMessage,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: messageEntity,
      }).promise();

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessage(params: GetMessageInput): Promise<GetMessageOutput> {
    try {
      this.loggerService.trace("getMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      const message = await this.get({ Key: { pk: messageId, sk: EntityTypeV2.Message } }, "Message");

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput> {
    try {
      this.loggerService.trace("updateMessage called", { params }, this.constructor.name);

      const { messageId, updates } = params;

      const message = await this.partialUpdate(messageId, EntityTypeV2.Message, updates);

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async markMessageSeen(params: MarkMessageSeenInput): Promise<MarkMessageSeenOutput> {
    try {
      this.loggerService.trace("markMessageSeen called", { params }, this.constructor.name);

      const { messageId, userId } = params;

      const message = await this.update({
        Key: { pk: messageId, sk: EntityTypeV2.Message },
        UpdateExpression: "SET #seenAt.#userId = :seenAtValue",
        ExpressionAttributeNames: {
          "#seenAt": "seenAt",
          "#userId": userId,
        },
        ExpressionAttributeValues: { ":seenAtValue": new Date().toISOString() },
      });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in markMessageSeen", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async markMessageUnseen(params: MarkMessageUnseenInput): Promise<MarkMessageUnseenOutput> {
    try {
      this.loggerService.trace("markMessageUnseen called", { params }, this.constructor.name);

      const { messageId, userId } = params;

      const message = await this.update({
        Key: { pk: messageId, sk: EntityTypeV2.Message },
        UpdateExpression: "SET #seenAt.#userId = :seenAtValue",
        ExpressionAttributeNames: {
          "#seenAt": "seenAt",
          "#userId": userId,
        },
        ExpressionAttributeValues: { ":seenAtValue": null },
      });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in markMessageUnseen", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addMessageReaction(params: AddMessageReactionInput): Promise<AddMessageReactionOutput> {
    try {
      this.loggerService.trace("addMessageReaction called", { params }, this.constructor.name);

      const { messageId, userId, reaction } = params;

      const message = await this.update({
        Key: { pk: messageId, sk: EntityTypeV2.Message },
        UpdateExpression: "ADD #reactions.#reaction :value",
        ExpressionAttributeNames: {
          "#reactions": "reactions",
          "#reaction": reaction,
        },
        ExpressionAttributeValues: { ":value": this.documentClient.createSet([ userId ]) },
      });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in addMessageReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeMessageReaction(params: RemoveMessageReactionInput): Promise<RemoveMessageReactionOutput> {
    try {
      this.loggerService.trace("removeMessageReaction called", { params }, this.constructor.name);

      const { messageId, userId, reaction } = params;

      const message = await this.update({
        Key: { pk: messageId, sk: EntityTypeV2.Message },
        UpdateExpression: "DELETE #reactions.#reaction :value",
        ExpressionAttributeNames: {
          "#reactions": "reactions",
          "#reaction": reaction,
        },
        ExpressionAttributeValues: { ":value": this.documentClient.createSet([ userId ]) },
      });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeMessageReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessages(params: GetMessagesInput): Promise<GetMessagesOutput> {
    try {
      this.loggerService.trace("getMessages called", { params }, this.constructor.name);

      const { messageIds } = params;

      const messages = await this.batchGet({ Keys: messageIds.map((messageId) => ({ pk: messageId, sk: EntityTypeV2.Message })) });

      return { messages };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, agenda, exclusiveStartKey, limit } = params;

      const { Items: messages, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
        IndexName: agenda ? this.gsiTwoIndexName : this.gsiOneIndexName,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#pk": agenda ? "gsi2pk" : "gsi1pk",
          "#sk": agenda ? "gsi2sk" : "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":pk": agenda ? `${KeyPrefixV2.Agenda}${agenda}_${conversationId}` : conversationId,
          ":skPrefix": `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}`,
        },
      });

      return {
        messages,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput> {
    try {
      this.loggerService.trace("getRepliesByMessageId called", { params }, this.constructor.name);

      const { messageId, exclusiveStartKey, limit } = params;

      const { Items: messages, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `${KeyPrefixV2.ReplyTo}${messageId}`,
          ":skPrefix": `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}`,
        },
      });

      return {
        messages,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getRepliesByMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public convertRawMessageToMessage(params: ConvertRawMessageToMessageInput): ConvertRawMessageToMessageOutput {
    try {
      this.loggerService.trace("convertRawMessageToMessage called", { params }, this.constructor.name);

      const { rawMessage } = params;

      const message = this.cleanse(rawMessage);

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertRawMessageToMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected override cleanse<T>(item: RawEntity<T>): CleansedEntity<T> {
    try {
      this.loggerService.trace("cleanse called", { item }, this.constructor.name);

      const { reactions: rawReactions, ...rest } = item as unknown as RawMessage;

      const reactions: Record<string, UserId[]> = {};

      Object.entries(rawReactions).forEach(([ reaction, userIdSet ]) => {
        reactions[reaction] = userIdSet.values as UserId[];
      }, {});

      return super.cleanse({ ...rest, reactions });
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanse", { error, item }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageRepositoryInterface {
  createMessage(params: CreateMessageInput): Promise<CreateMessageOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessages(params: GetMessagesInput): Promise<GetMessagesOutput>;
  getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput>;
  updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput>;
  markMessageSeen(params: MarkMessageSeenInput): Promise<MarkMessageSeenOutput>;
  markMessageUnseen(params: MarkMessageUnseenInput): Promise<MarkMessageUnseenOutput>;
  addMessageReaction(params: AddMessageReactionInput): Promise<AddMessageReactionOutput>;
  removeMessageReaction(params: RemoveMessageReactionInput): Promise<RemoveMessageReactionOutput>
  convertRawMessageToMessage(params: ConvertRawMessageToMessageInput): ConvertRawMessageToMessageOutput;
}

type MessageRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  from: UserId;
  createdAt: string;
  updatedAt: string;
  seenAt: Record<UserId, string | null>;
  reactions: Record<string, UserId[]>;
  replyCount: number;
  mimeType: MessageMimeType;
  transcript?: string;
  replyTo?: MessageId;
  agenda?: string;
  title?: string;
}

export interface RawMessage extends Omit<Message, "reactions"> {
  entityType: EntityTypeV2.Message,
  pk: MessageId;
  sk: EntityTypeV2.Message;
  reactions: Record<string, DynamoDB.DocumentClient.DynamoDbSet>;
  gsi1pk?: ConversationId | `${KeyPrefixV2.ReplyTo}${MessageId}`;
  gsi1sk?: `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}${string}`;
  gsi2pk?: `${KeyPrefixV2.Agenda}${string}_${ConversationId}`;
  gsi2sk?: `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}${string}`;
}

export interface CreateMessageInput {
  message: Message;
}

export interface CreateMessageOutput {
  message: Message;
}

export interface GetMessageInput {
  messageId: MessageId;
}

export interface GetMessageOutput {
  message: Message;
}

export interface GetMessagesByConversationIdInput {
  conversationId: ConversationId;
  agenda?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByConversationIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetRepliesByMessageIdInput {
  messageId: MessageId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetRepliesByMessageIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export type MessageUpdates = Partial<Pick<Message, "transcript">>;

export interface UpdateMessageInput {
  messageId: MessageId;
  updates: MessageUpdates;
}

export interface UpdateMessageOutput {
  message: Message;
}

export interface MarkMessageSeenInput {
  messageId: MessageId;
  userId: UserId;
}

export interface MarkMessageSeenOutput {
  message: Message;
}

export interface MarkMessageUnseenInput {
  messageId: MessageId;
  userId: UserId;
}

export interface MarkMessageUnseenOutput {
  message: Message;
}

export interface AddMessageReactionInput {
  messageId: MessageId;
  userId: UserId;
  reaction: string;
}

export interface AddMessageReactionOutput {
  message: Message;
}

export interface RemoveMessageReactionInput {
  messageId: MessageId;
  userId: UserId;
  reaction: string;
}

export interface RemoveMessageReactionOutput {
  message: Message;
}

export interface GetMessagesInput {
  messageIds: MessageId[];
}

export interface GetMessagesOutput {
  messages: Message[];
}

export interface ConvertRawMessageToMessageInput {
  rawMessage: RawMessage;

}

export interface ConvertRawMessageToMessageOutput {
  message: Message;
}

export type MessageId = `${KeyPrefixV2.Message}${string}`;

export type ConversationId = GroupId | MeetingId | OneOnOneId;
