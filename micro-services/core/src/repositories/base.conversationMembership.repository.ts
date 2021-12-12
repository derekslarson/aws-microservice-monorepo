/* eslint-disable no-nested-ternary */
import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, RawEntity, CleansedEntity } from "@yac/util";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "./user.dynamo.repository.v2";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { MessageId } from "./message.dynamo.repository.v2";

@injectable()
export abstract class BaseConversationMembershipDynamoRepository<T extends BaseConversationMembership> extends BaseDynamoRepositoryV2<T> {
  constructor(
  @unmanaged() documentClientFactory: DocumentClientFactory,
    @unmanaged() tableName: string,
    @unmanaged() loggerService: LoggerServiceInterface,
  ) {
    super(documentClientFactory, tableName, loggerService);
  }

  public async addUnreadMessageToConversationMembership(params: AddMessageToConversationMembershipInput): Promise<AddMessageToConversationMembershipOutput<T>> {
    try {
      this.loggerService.trace("addUnreadMessageToConversationMembership called", { params }, this.constructor.name);

      const { conversationId, userId, messageId, sender, updateUpdatedAt } = params;

      const timestamp = new Date().toISOString();

      const conversationMembership = await this.update({
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

      return { conversationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUnreadMessageToConversationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUnreadMessageFromConversationMembership(params: RemoveUnreadMessageFromConversationMembershipInput): Promise<RemoveUnreadMessageFromConversationMembershipOutput<T>> {
    try {
      this.loggerService.trace("removeUnreadMessageFromConversationMembership called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const conversationMembership = await this.update({
        Key: {
          pk: conversationId,
          sk: userId,
        },
        UpdateExpression: "DELETE #unreadMessages :messageIdSet",
        ExpressionAttributeNames: { "#unreadMessages": "unreadMessages" },
        ExpressionAttributeValues: { ":messageIdSet": this.documentClient.createSet([ messageId ]) },
      });

      return { conversationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUnreadMessageFromConversationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected override cleanse<T>(item: RawEntity<T>): CleansedEntity<T> {
    try {
      this.loggerService.trace("cleanse called", { item }, this.constructor.name);

      if (!this.isRawConversationMembership(item)) {
        return super.cleanse(item);
      }

      const { unreadMessages, ...rest } = item;

      return super.cleanse({
        ...rest,
        unreadMessages: unreadMessages ? unreadMessages.values : [],
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanse", { error, item }, this.constructor.name);

      throw error;
    }
  }

  private isRawConversationMembership(rawEntity: RawEntity): rawEntity is RawBaseConversationMembership {
    try {
      this.loggerService.trace("isRawConversationMembership called", { rawEntity }, this.constructor.name);

      return "unreadMessages" in rawEntity
        && typeof rawEntity.unreadMessages === "object"
        && rawEntity.unreadMessages != null
        && "values" in rawEntity.unreadMessages;
    } catch (error: unknown) {
      this.loggerService.error("Error in isRawConversationMembership", { error, rawEntity }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationMembershipRepositoryInterface<T extends BaseConversationMembership> {
  addMessageToConversationMembership(params: AddMessageToConversationMembershipInput): Promise<AddMessageToConversationMembershipOutput<T>>;
  removeUnreadMessageFromConversationMembership(params: RemoveUnreadMessageFromConversationMembershipInput): Promise<RemoveUnreadMessageFromConversationMembershipOutput<T>>;
}

export interface BaseConversationMembership {
  userActiveAt: string;
  conversationActiveAt: string
  unreadMessages: MessageId[];
}

export interface RawBaseConversationMembership extends Omit<BaseConversationMembership, "unreadMessages"> {
  entityType: EntityTypeV2;
  pk: UserId;
  sk: string;
  unreadMessages?: DynamoDB.DocumentClient.DynamoDbSet;
}

export interface AddMessageToConversationMembershipInput {
  userId: UserId;
  conversationId: string;
  messageId: MessageId;
  sender?: boolean;
  updateUpdatedAt?: boolean;
}

export interface AddMessageToConversationMembershipOutput<T extends BaseConversationMembership> {
  conversationMembership: T;
}

export interface RemoveUnreadMessageFromConversationMembershipInput {
  userId: UserId;
  conversationId: string;
  messageId: MessageId;
}

export interface RemoveUnreadMessageFromConversationMembershipOutput<T extends BaseConversationMembership> {
  conversationMembership: T;
}
