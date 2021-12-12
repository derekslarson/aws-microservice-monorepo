/* eslint-disable import/no-cycle */
/* eslint-disable no-nested-ternary */
import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, RawEntity, CleansedEntity } from "@yac/util";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { UserId } from "./user.dynamo.repository.v2";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { ConversationId, MessageId } from "./message.dynamo.repository.v2";

@injectable()
export abstract class BaseConversationMembershipDynamoRepository<T extends BaseConversationMembership, U extends ConversationId> extends BaseDynamoRepositoryV2<T> {
  constructor(
  @unmanaged() documentClientFactory: DocumentClientFactory,
    @unmanaged() tableName: string,
    @unmanaged() loggerService: LoggerServiceInterface,
  ) {
    super(documentClientFactory, tableName, loggerService);
  }

  public async addUnreadMessageToConversationMembership(params: AddUnreadMessageToConversationMembershipInput<U>): Promise<AddUnreadMessageToConversationMembershipOutput<T>> {
    try {
      this.loggerService.trace("addUnreadMessageToConversationMembership called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const conversationMembership = await this.update({
        Key: { pk: userId, sk: conversationId },
        UpdateExpression: "ADD #unseenMessages :messageIdSet",
        ExpressionAttributeNames: { "#unseenMessages": "unseenMessages" },
        ExpressionAttributeValues: { ":messageIdSet": this.documentClient.createSet([ messageId ]) },
      });

      return { conversationMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUnreadMessageToConversationMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUnreadMessageFromConversationMembership(params: RemoveUnreadMessageFromConversationMembershipInput<U>): Promise<RemoveUnreadMessageFromConversationMembershipOutput<T>> {
    try {
      this.loggerService.trace("removeUnreadMessageFromConversationMembership called", { params }, this.constructor.name);

      const { conversationId, userId, messageId } = params;

      const conversationMembership = await this.update({
        Key: { pk: userId, sk: conversationId },
        UpdateExpression: "DELETE #unseenMessages :messageIdSet",
        ExpressionAttributeNames: { "#unseenMessages": "unseenMessages" },
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

      const { unseenMessages, ...rest } = item as unknown as RawBaseConversationMembership;

      return super.cleanse({
        ...rest,
        unseenMessages: unseenMessages ? unseenMessages.values : [],
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanse", { error, item }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationMembershipRepositoryInterface<T extends BaseConversationMembership, U extends ConversationId> {
  addUnreadMessageToConversationMembership(params: AddUnreadMessageToConversationMembershipInput<U>): Promise<AddUnreadMessageToConversationMembershipOutput<T>>;
  removeUnreadMessageFromConversationMembership(params: RemoveUnreadMessageFromConversationMembershipInput<U>): Promise<RemoveUnreadMessageFromConversationMembershipOutput<T>>;
}

export interface BaseConversationMembership {
  unseenMessages: MessageId[];
}

export interface RawBaseConversationMembership extends Omit<BaseConversationMembership, "unseenMessages"> {
  entityType: EntityTypeV2;
  pk: UserId;
  sk: string;
  unseenMessages?: DynamoDB.DocumentClient.DynamoDbSet;
}

export interface AddUnreadMessageToConversationMembershipInput<T extends ConversationId> {
  userId: UserId;
  conversationId: T;
  messageId: MessageId;
  sender?: boolean;
  updateUpdatedAt?: boolean;
}

export interface AddUnreadMessageToConversationMembershipOutput<T extends BaseConversationMembership> {
  conversationMembership: T;
}

export interface RemoveUnreadMessageFromConversationMembershipInput<T extends ConversationId> {
  userId: UserId;
  conversationId: T;
  messageId: MessageId;
}

export interface RemoveUnreadMessageFromConversationMembershipOutput<T extends BaseConversationMembership> {
  conversationMembership: T;
}
