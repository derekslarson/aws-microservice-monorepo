import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { MessageId } from "../types/messageId.type";
import { ConversationId } from "../types/conversationId.type";
import { UserId } from "../types/userId.type";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { UpdateMessageReactionAction } from "../enums/updateMessageReactionAction.enum";

@injectable()
export class MessageDynamoRepository extends BaseDynamoRepositoryV2<MessageWithReactionsSet> implements MessageRepositoryInterface {
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

      const rawReactions = Object.entries(reactions).reduce((acc: Record<string, DynamoDB.DocumentClient.DynamoDbSet>, entry) => {
        const [ reaction, userIds ] = entry;

        acc[reaction] = this.documentClient.createSet(userIds);

        return acc;
      }, {});

      const messageEntity: RawMessage = {
        entityType: EntityType.Message,
        pk: message.id,
        sk: message.id,
        gsi1pk: message.conversationId,
        gsi1sk: message.id,
        gsi2pk: message.replyTo,
        gsi2sk: message.replyTo && message.id,
        reactions: rawReactions,
        ...restOfMessage,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
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

      const rawMessage = await this.get({ Key: { pk: messageId, sk: messageId } }, "Message");

      const message = this.cleanseReactionsSet(rawMessage);

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessages(params: GetMessagesInput): Promise<GetMessagesOutput> {
    try {
      this.loggerService.trace("getMessages called", { params }, this.constructor.name);

      const { messageIds } = params;

      const rawMessages = await this.batchGet({ Keys: messageIds.map((messageId) => ({ pk: messageId, sk: messageId })) });

      const messages = rawMessages.map((message) => this.cleanseReactionsSet(message));

      return { messages };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessageSeenAt(params: UpdateMessageSeenAtInput): Promise<UpdateMessageSeenAtOutput> {
    try {
      this.loggerService.trace("updateMessageSeenAt called", { params }, this.constructor.name);

      const { messageId, userId, seenAtValue } = params;

      const rawMessage = await this.update({
        Key: {
          pk: messageId,
          sk: messageId,
        },
        UpdateExpression: "SET #seenAt.#userId = :seenAtValue",
        ExpressionAttributeNames: {
          "#seenAt": "seenAt",
          "#userId": userId,
        },
        ExpressionAttributeValues: { ":seenAtValue": seenAtValue },
      });

      const message = this.cleanseReactionsSet(rawMessage);

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageSeenAt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessageReaction(params: UpdateMessageReactionInput): Promise<UpdateMessageReactionOutput> {
    try {
      this.loggerService.trace("updateMessageReaction called", { params }, this.constructor.name);

      const { messageId, userId, reaction, action } = params;

      const rawMessage = await this.update({
        Key: {
          pk: messageId,
          sk: messageId,
        },
        UpdateExpression: `${action === UpdateMessageReactionAction.Add ? "ADD" : "DELETE"} #reactions.#reaction :value`,
        ExpressionAttributeNames: {
          "#reactions": "reactions",
          "#reaction": reaction,
        },
        ExpressionAttributeValues: { ":value": this.documentClient.createSet([ userId ]) },
      });

      const message = this.cleanseReactionsSet(rawMessage);

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessageReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async incrementMessageReplyCount(params: IncrementMessageReplyCountInput): Promise<IncrementMessageReplyCountOutput> {
    try {
      this.loggerService.trace("incrementMessageReplyCount called", { params }, this.constructor.name);

      const { messageId } = params;

      const rawMessage = await this.update({
        Key: {
          pk: messageId,
          sk: messageId,
        },
        UpdateExpression: "ADD #replyCount :one",
        ExpressionAttributeNames: { "#replyCount": "replyCount" },
        ExpressionAttributeValues: { ":one": 1 },
      });

      const message = this.cleanseReactionsSet(rawMessage);

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in incrementMessageReplyCount", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { params }, this.constructor.name);

      const { conversationId, exclusiveStartKey, limit } = params;

      const { Items: rawMessages, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        ScanIndexForward: false,
        IndexName: this.gsiOneIndexName,
        Limit: limit ?? 25,
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

      const messages = rawMessages.map((message) => this.cleanseReactionsSet(message));

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

      const { Items: rawReplies, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
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

      const replies = rawReplies.map((reply) => this.cleanseReactionsSet(reply));

      return {
        replies,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getRepliesByMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public cleanseReactionsSet(messageWithReactionsSet: MessageWithReactionsSet): Message {
    try {
      this.loggerService.trace("cleanseReactionsSet called", { messageWithReactionsSet }, this.constructor.name);

      const { reactions: rawReactions, ...rest } = messageWithReactionsSet;

      const reactions = Object.entries(rawReactions).reduce((acc: Record<string, UserId[]>, entry) => {
        const [ reaction, userIdSet ] = entry;

        acc[reaction] = userIdSet.values as UserId[];

        return acc;
      }, {});

      return {
        ...rest,
        reactions,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanseReactionsSet", { error, messageWithReactionsSet }, this.constructor.name);

      throw error;
    }
  }

  public convertRawMessageToMessage(params: ConvertRawMessageToMessageInput): ConvertRawMessageToMessageOutput {
    try {
      this.loggerService.trace("convertRawMessageToMessage called", { params }, this.constructor.name);

      const { rawMessage } = params;

      const messageWithReactionsSet = this.cleanse(rawMessage);
      const message = this.cleanseReactionsSet(messageWithReactionsSet);

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
  updateMessageSeenAt(params: UpdateMessageSeenAtInput): Promise<UpdateMessageSeenAtOutput>;
  updateMessageReaction(params: UpdateMessageReactionInput): Promise<UpdateMessageReactionOutput>;
  incrementMessageReplyCount(params: IncrementMessageReplyCountInput): Promise<IncrementMessageReplyCountOutput>;
  getMessagesByConversationId(params: GetMessagesByConversationIdInput): Promise<GetMessagesByConversationIdOutput>;
  getRepliesByMessageId(params: GetRepliesByMessageIdInput): Promise<GetRepliesByMessageIdOutput>;
  convertRawMessageToMessage(params: ConvertRawMessageToMessageInput): ConvertRawMessageToMessageOutput;
}

type MessageRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;
export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  from: UserId;
  createdAt: string;
  seenAt: Record<UserId, string | null>;
  reactions: Record<string, UserId[]>;
  replyCount: number;
  mimeType: MessageMimeType;
  transcript: string;
  replyTo?: MessageId;
  title?: string;
}

export interface MessageWithReactionsSet extends Omit<Message, "reactions"> {
  reactions: Record<string, DynamoDB.DocumentClient.DynamoDbSet>;
}

export interface RawMessage extends Omit<Message, "reactions"> {
  entityType: EntityType.Message,
  pk: MessageId;
  sk: MessageId;
  gsi1pk: ConversationId;
  gsi1sk: MessageId;
  // Message replying to (if a reply)
  gsi2pk?: MessageId;
  gsi2sk?: MessageId;
  reactions: Record<string, DynamoDB.DocumentClient.DynamoDbSet>;
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

export interface GetMessagesInput {
  messageIds: MessageId[];
}

export interface GetMessagesOutput {
  messages: Message[];
}

export interface UpdateMessageSeenAtInput {
  messageId: MessageId;
  userId: UserId;
  seenAtValue: string | null;
}

export interface UpdateMessageSeenAtOutput {
  message: Message;
}

export interface GetMessagesByConversationIdInput {
  conversationId: ConversationId;
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
  replies: Message[];
  lastEvaluatedKey?: string;
}

export interface UpdateMessageReactionInput {
  messageId: MessageId;
  userId: UserId;
  reaction: string;
  action: UpdateMessageReactionAction;
}

export interface UpdateMessageReactionOutput {
  message: Message;
}

export interface IncrementMessageReplyCountInput {
  messageId: MessageId;

}

export interface IncrementMessageReplyCountOutput {
  message: Message;
}

export interface ConvertRawMessageToMessageInput {
  rawMessage: RawMessage;

}

export interface ConvertRawMessageToMessageOutput {
  message: Message;
}
