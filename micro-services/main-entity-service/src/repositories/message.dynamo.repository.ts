import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, Message, KeyPrefix, EntityType, NotFoundError } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MessageDynamoRepository extends BaseDynamoRepositoryV2 implements MessageRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
  }

  public async createMessage(message: Omit<Message, "id">): Promise<Message> {
    try {
      this.loggerService.trace("createMessage called", { message }, this.constructor.name);

      const id = `${message.replyTo ? KeyPrefix.Reply : KeyPrefix.Message}${this.idService.generateId()}`;

      const messageEntity: RawEntity<Message> = {
        type: EntityType.Message,
        pk: message.conversationId,
        sk: id,
        gsi1pk: id,
        gsi1sk: id,
        ...(message.replyTo ? { gsi2pk: message.replyTo, gsi2sk: id } : {}),
        ...message,
        id,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: messageEntity,
      }).promise();

      const conversationMemberIds = Object.keys(message.seenAt).filter((userId) => !message.seenAt[userId]);

      await Promise.all(conversationMemberIds.map((userId) => this.documentClient.update({
        TableName: this.tableName,
        Key: { pk: message.conversationId, sk: userId },
        UpdateExpression: "ADD #unreadMessages :unreadMessage SET #recentMessageId = :messageId, #updatedAt = :timestamp",
        ExpressionAttributeNames: {
          "#unreadMessages": "unreadMessages",
          "#recentMessageId": "recentMessageId",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":unreadMessage": this.documentClient.createSet([ id ]),
          ":messageId": id,
          ":timestamp": new Date().toISOString(),
        },
      }).promise()));

      return this.cleanse(messageEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }

  public async getMessage(messageId: string): Promise<Message> {
    try {
      this.loggerService.trace("getMessage called", { messageId }, this.constructor.name);

      const { Items: [ message ] } = await this.query<Message>({
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": messageId,
          ":gsi1sk": messageId,
        },
      });

      if (!message) {
        throw new NotFoundError("Message not found");
      }

      return message;
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, messageId }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessage(messageId: string, update: Partial<Message>): Promise<Message> {
    try {
      this.loggerService.trace("updateMessage called", { messageId, update }, this.constructor.name);

      const fetchedMessage = await this.getMessage(messageId);

      const message = await this.partialUpdate<Message>(fetchedMessage.conversationId, messageId, update);

      return message;
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessage", { error, messageId, update }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { conversationId }, this.constructor.name);

      const { Items: messages } = await this.query<Message>({
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :message)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": conversationId,
          ":message": KeyPrefix.Message,
        },
      });

      return messages;
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, conversationId }, this.constructor.name);

      throw error;
    }
  }

  public async getRepliesByMessageId(messageId: string): Promise<Message[]> {
    try {
      this.loggerService.trace("getRepliesByMessageId called", { messageId }, this.constructor.name);

      const { Items: messages } = await this.query<Message>({
        IndexName: this.gsiTwoIndexName,
        KeyConditionExpression: "#gsi2pk = :gsi2pk AND begins_with(#gsi2sk, :reply)",
        ExpressionAttributeNames: {
          "#gsi2pk": "gsi2pk",
          "#gsi2sk": "gsi2sk",
        },
        ExpressionAttributeValues: {
          ":gsi2pk": messageId,
          ":reply": KeyPrefix.Reply,
        },
      });

      return messages;
    } catch (error: unknown) {
      this.loggerService.error("Error in getRepliesByMessageId", { error, messageId }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageRepositoryInterface {
  createMessage(message: Omit<Message, "id">): Promise<Message>;
  updateMessage(messageId: string, update: Partial<Message>): Promise<Message>;
  getMessage(messageId: string): Promise<Message>;
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  getRepliesByMessageId(messageId: string): Promise<Message[]>;
}

type MessageRepositoryConfigType = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;
