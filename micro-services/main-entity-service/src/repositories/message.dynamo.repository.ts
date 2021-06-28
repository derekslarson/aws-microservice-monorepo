import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, Message, IdPrefix, EntityType } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class MessageDynamoRepository extends BaseDynamoRepositoryV2<Message> implements MessageRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MessageRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createMessage(message: Omit<Message, "id" | "sentAt" | "hasReplies">): Promise<Message> {
    try {
      this.loggerService.trace("createMessage called", { message }, this.constructor.name);

      const id = `${message.replyTo ? IdPrefix.Reply : IdPrefix.Message}-${this.idService.generateId()}`;

      const messageEntity: RawEntity<Message> = {
        pk: message.conversationId,
        sk: id,
        ...(message.replyTo ? { gsi2pk: message.replyTo, gsi2sk: id } : {}),
        ...message,
        id,
        type: EntityType.Message,
        sentAt: new Date().toISOString(),
        hasReplies: false,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: messageEntity,
      }).promise();

      return this.cleanse(messageEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, message }, this.constructor.name);

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
          ":message": IdPrefix.Message,
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
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :reply)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": messageId,
          ":reply": IdPrefix.Reply,
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
  createMessage(message: Omit<Message, "id" | "sentAt" | "hasReplies">): Promise<Message>
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  getRepliesByMessageId(messageId: string): Promise<Message[]>;
}

type MessageRepositoryConfigType = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;
