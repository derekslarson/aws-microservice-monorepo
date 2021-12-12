/* eslint-disable no-nested-ternary */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";
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

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { message } = params;

      const messageEntity: RawMessage = {
        entityType: EntityTypeV2.Message,
        pk: message.id,
        sk: EntityTypeV2.Message,
        gsi1pk: message.replyTo ? `${KeyPrefixV2.ReplyTo}${message.replyTo}` : message.agenda ? `${KeyPrefixV2.Agenda}${message.agenda}_${message.conversationId}` : message.conversationId,
        gsi1sk: `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}${message.createdAt}`,
        ...message,
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
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": agenda ? `${KeyPrefixV2.Agenda}${agenda}_${conversationId}` : conversationId,
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
}

export interface MessageRepositoryInterface {
  createMessage(params: CreateMessageInput): Promise<CreateMessageOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessages(params: GetMessagesInput): Promise<GetMessagesOutput>;
  getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput>;
  getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput>;
  updateMessage(params: UpdateMessageInput): Promise<UpdateMessageOutput>;
  convertRawMessageToMessage(params: ConvertRawMessageToMessageInput): ConvertRawMessageToMessageOutput;
}

type MessageRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  from: UserId;
  createdAt: string;
  updatedAt: string;
  transcript?: string;
  replyTo?: MessageId;
  agenda?: string;
}

export interface RawMessage extends Message {
  entityType: EntityTypeV2.Message,
  pk: MessageId;
  sk: EntityTypeV2.Message;
  gsi1pk?: ConversationId | `${KeyPrefixV2.Agenda}${string}_${ConversationId}` | `${KeyPrefixV2.ReplyTo}${MessageId}`;
  gsi1sk?: `${KeyPrefixV2.Message}${KeyPrefixV2.Sent}${string}`;
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
