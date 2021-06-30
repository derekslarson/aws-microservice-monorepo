import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { Message } from "../models/message.model";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { RawEntity } from "../types/raw.entity.type";

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

      const messageEntity: RawEntity<Message> = {
        type: EntityType.Message,
        pk: message.id,
        sk: message.id,
        gsi1pk: message.conversationId,
        gsi1sk: message.id,
        gsi2pk: message.replyTo,
        gsi2sk: message.replyTo && message.id,
        ...message,
      };

      await this.documentClient.put({
        TableName: this.tableName,
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

      const message = await this.get({ Key: { pk: messageId, sk: messageId } });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey } = params;

      const { Items: messages, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :message)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": conversationId,
          ":message": KeyPrefix.Message,
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

      const { messageId, exclusiveStartKey } = params;

      const { Items: replies, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
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

      return {
        replies,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getRepliesByMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageRepositoryInterface {
  createMessage(params: CreateMessageInput): Promise<CreateMessageOutput>;
  getMessage(params: GetMessageInput): Promise<GetMessageOutput>;
  getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput>;
  getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput>;
}

type MessageRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface CreateMessageInput {
  message: Message;
}

export interface CreateMessageOutput {
  message: Message;
}

export interface GetMessageInput {
  messageId: string;
}

export interface GetMessageOutput {
  message: Message;
}

export interface GetMessagesByConversationIdInput {
  conversationId: string;
  exclusiveStartKey?: string;
}

export interface GetMessagesByConversationIdOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetRepliesByMessageIdInput {
  messageId: string;
  exclusiveStartKey?: string;
}

export interface GetRepliesByMessageIdOutput {
  replies: Message[];
  lastEvaluatedKey?: string;
}

// @injectable()
// export class MessageDynamoRepository extends BaseDynamoRepositoryV2 implements MessageRepositoryInterface {
//   private gsiOneIndexName: string;

//   private gsiTwoIndexName: string;

//   constructor(
//   @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
//     @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
//     @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
//     @inject(TYPES.EnvConfigInterface) envConfig: MessageRepositoryConfig,
//   ) {
//     super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);
//     this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
//     this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
//   }

//   public async createMessage(message: Omit<Message, "id" | "seenAt">): Promise<Message> {
//     try {
//       this.loggerService.trace("createMessage called", { message }, this.constructor.name);

//       const id = `${message.replyTo ? KeyPrefix.Reply : KeyPrefix.Message}${this.idService.generateId()}`;

//       const { Items: conversationMembers } = await this.query<ConversationUserRelationship>({
//         KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
//         ExpressionAttributeNames: {
//           "#pk": "pk",
//           "#sk": "sk",
//         },
//         ExpressionAttributeValues: {
//           ":pk": message.conversationId,
//           ":user": KeyPrefix.User,
//         },
//       });

//       const seenAt = conversationMembers.reduce((acc: { [key: string]: string | null }, member) => {
//         acc[member.userId] = member.userId === message.from ? new Date().toISOString() : null;

//         return acc;
//       }, {});

//       let replyTo: string | undefined;

//       if (message.replyTo) {
//         const replyToMessage = await this.getMessage(message.replyTo);

//         replyTo = replyToMessage.replyTo || message.replyTo;
//       }

//       const messageEntity: RawEntity<Message> = {
//         type: EntityType.Message,
//         pk: id,
//         sk: id,
//         gsi1pk: message.conversationId,
//         gsi1sk: id,
//         gsi2pk: replyTo,
//         gsi2sk: replyTo ? id : undefined,
//         ...message,
//         id,
//         seenAt,
//         replyTo,
//       };

//       await this.documentClient.put({
//         TableName: this.tableName,
//         Item: messageEntity,
//       }).promise();

//       await Promise.all(conversationMembers.map(({ userId }) => {
//         let updateExpression = "SET #recentMessageId = :messageId, #updatedAt = :timestamp";

//         const expressionAttributeNames: Record<string, string> = {
//           "#recentMessageId": "recentMessageId",
//           "#updatedAt": "updatedAt",
//         };

//         const expressionAttributeValues: Record<string, unknown> = {
//           ":messageId": id,
//           ":timestamp": new Date().toISOString(),
//         };

//         if (userId !== message.from) {
//           updateExpression += " ADD #unreadMessages :unreadMessage";
//           expressionAttributeNames["#unreadMessages"] = "unreadMessages";
//           expressionAttributeValues[":unreadMessage"] = this.documentClient.createSet([ id ]);
//         }

//         return this.documentClient.update({
//           TableName: this.tableName,
//           Key: { pk: message.conversationId, sk: userId },
//           UpdateExpression: updateExpression,
//           ExpressionAttributeNames: expressionAttributeNames,
//           ExpressionAttributeValues: expressionAttributeValues,
//         }).promise();
//       }));

//       return this.cleanse(messageEntity);
//     } catch (error: unknown) {
//       this.loggerService.error("Error in createMessage", { error, message }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async getMessage(messageId: string): Promise<Message> {
//     try {
//       this.loggerService.trace("getMessage called", { messageId }, this.constructor.name);

//       const message = await this.get<Message>({ Key: { pk: messageId, sk: messageId } });

//       return message;
//     } catch (error: unknown) {
//       this.loggerService.error("Error in getMessage", { error, messageId }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async updateMessage(messageId: string, update: Partial<Message>): Promise<Message> {
//     try {
//       this.loggerService.trace("updateMessage called", { messageId, update }, this.constructor.name);

//       const fetchedMessage = await this.getMessage(messageId);

//       const message = await this.partialUpdate<Message>(fetchedMessage.conversationId, messageId, update);

//       return message;
//     } catch (error: unknown) {
//       this.loggerService.error("Error in updateMessage", { error, messageId, update }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async markMessageRead(messageId: string, userId: string): Promise<void> {
//     try {
//       this.loggerService.trace("markMessageRead called", { messageId }, this.constructor.name);

//       const message = await this.getMessage(messageId);

//       const timestamp = new Date().toISOString();

//       await Promise.all([
//         this.documentClient.update({
//           TableName: this.tableName,
//           Key: {
//             pk: message.conversationId,
//             sk: messageId,
//           },
//           UpdateExpression: "SET #seenAt.#userId = :timestamp",
//           ExpressionAttributeNames: {
//             "#seenAt": "seenAt",
//             "#userId": userId,
//           },
//           ExpressionAttributeValues: { ":timestamp": timestamp },
//         }).promise(),
//         this.documentClient.update({
//           TableName: this.tableName,
//           Key: {
//             pk: message.conversationId,
//             sk: userId,
//           },
//           UpdateExpression: "DELETE #unreadMessages :messageIdSet",
//           ExpressionAttributeNames: { "#unreadMessages": "unreadMessages" },
//           ExpressionAttributeValues: { ":messageIdSet": this.documentClient.createSet([ messageId ]) },
//         }).promise(),
//       ]);
//     } catch (error: unknown) {
//       this.loggerService.error("Error in markMessageRead", { error, messageId }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async markMessageUnread(messageId: string, userId: string): Promise<void> {
//     try {
//       this.loggerService.trace("markMessageRead called", { messageId }, this.constructor.name);

//       const message = await this.getMessage(messageId);

//       await Promise.all([
//         this.documentClient.update({
//           TableName: this.tableName,
//           Key: {
//             pk: message.conversationId,
//             sk: messageId,
//           },
//           UpdateExpression: "SET #seenAt.#userId = :null",
//           ExpressionAttributeNames: {
//             "#seenAt": "seenAt",
//             "#userId": userId,
//           },
//           ExpressionAttributeValues: { ":null": null },
//         }).promise(),
//         this.documentClient.update({
//           TableName: this.tableName,
//           Key: {
//             pk: message.conversationId,
//             sk: userId,
//           },
//           UpdateExpression: "ADD #unreadMessages :messageIdSet",
//           ExpressionAttributeNames: { "#unreadMessages": "unreadMessages" },
//           ExpressionAttributeValues: { ":messageIdSet": this.documentClient.createSet([ messageId ]) },
//         }).promise(),
//       ]);
//     } catch (error: unknown) {
//       this.loggerService.error("Error in markMessageRead", { error, messageId }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async markConversationRead(conversationId: string, userId: string): Promise<void> {
//     try {
//       this.loggerService.trace("markMessageRead called", { conversationId }, this.constructor.name);

//       const conversationUserRelationship = await this.get<DynamoSetValues<ConversationUserRelationship, "unreadMessages">>({ Key: { pk: conversationId, sk: userId } });

//       if (conversationUserRelationship.unreadMessages?.values) {
//         await Promise.all(conversationUserRelationship.unreadMessages.values.map((messageId: string) => this.markMessageRead(messageId, userId)));
//       }
//     } catch (error: unknown) {
//       this.loggerService.error("Error in markMessageRead", { error, conversationId }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async getMessagesByConversationId(conversationId: string, exclusiveStartKey?: string): Promise<{ messages: Message[]; lastEvaluatedKey?: string; }> {
//     try {
//       this.loggerService.trace("getMessagesByConversationId called", { conversationId }, this.constructor.name);

//       const { Items: messages, LastEvaluatedKey } = await this.query<Message>({
//         ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
//         IndexName: this.gsiOneIndexName,
//         KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :message)",
//         ExpressionAttributeNames: {
//           "#gsi1pk": "gsi1pk",
//           "#gsi1sk": "gsi1sk",
//         },
//         ExpressionAttributeValues: {
//           ":gsi1pk": conversationId,
//           ":message": KeyPrefix.Message,
//         },
//       });

//       return {
//         messages,
//         ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
//       };
//     } catch (error: unknown) {
//       this.loggerService.error("Error in getMessagesByConversationId", { error, conversationId }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async getRepliesByMessageId(messageId: string, exclusiveStartKey?: string): Promise<{ replies: Message[]; lastEvaluatedKey?: string; }> {
//     try {
//       this.loggerService.trace("getRepliesByMessageId called", { messageId }, this.constructor.name);

//       const { Items: replies, LastEvaluatedKey } = await this.query<Message>({
//         ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
//         IndexName: this.gsiTwoIndexName,
//         KeyConditionExpression: "#gsi2pk = :gsi2pk AND begins_with(#gsi2sk, :reply)",
//         ExpressionAttributeNames: {
//           "#gsi2pk": "gsi2pk",
//           "#gsi2sk": "gsi2sk",
//         },
//         ExpressionAttributeValues: {
//           ":gsi2pk": messageId,
//           ":reply": KeyPrefix.Reply,
//         },
//       });

//       return {
//         replies,
//         ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
//       };
//     } catch (error: unknown) {
//       this.loggerService.error("Error in getRepliesByMessageId", { error, messageId }, this.constructor.name);

//       throw error;
//     }
//   }
// }

// export interface MessageRepositoryInterface {
//   createMessage(message: Omit<Message, "id" | "seenAt">): Promise<Message>;
//   updateMessage(messageId: string, update: Partial<Message>): Promise<Message>;
//   getMessage(messageId: string): Promise<Message>;
//   markMessageRead(messageId: string, userId: string): Promise<void>;
//   markMessageUnread(messageId: string, userId: string): Promise<void>;
//   markConversationRead(conversationId: string, userId: string): Promise<void>;
//   getMessagesByConversationId(conversationId: string, exclusiveStartKey?: string): Promise<{ messages: Message[]; lastEvaluatedKey?: string; }>;
//   getRepliesByMessageId(messageId: string, exclusiveStartKey?: string): Promise<{ replies: Message[]; lastEvaluatedKey?: string; }>;
// }

// type MessageRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;
