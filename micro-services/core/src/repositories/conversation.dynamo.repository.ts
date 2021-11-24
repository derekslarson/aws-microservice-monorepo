import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, CleansedEntity, DocumentClientFactory, LoggerServiceInterface, RecursivePartial } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { TeamId } from "../types/teamId.type";
import { ConversationId } from "../types/conversationId.type";
import { ConversationType as ConversationTypeEnum } from "../enums/conversationType.enum";
import { ConversationType } from "../types/conversationType.type";
import { UserId } from "../types/userId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";

@injectable()
export class ConversationDynamoRepository extends BaseDynamoRepositoryV2<Conversation> implements ConversationRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ConversationRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createConversation<T extends Conversation>(params: CreateConversationInput<T>): Promise<CreateConversationOutput<T>> {
    try {
      this.loggerService.trace("createConversation called", { params }, this.constructor.name);

      const { conversation } = params;

      const conversationEntity: RawConversation<T> = {
        entityType: this.getEntityTypeByConversationType(conversation.type),
        pk: conversation.id,
        sk: conversation.id,
        gsi1pk: conversation.teamId,
        gsi1sk: conversation.teamId && conversation.id,
        ...conversation,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: conversationEntity,
      }).promise();

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversation<T extends ConversationId>(params: GetConversationInput<T>): Promise<GetConversationOutput<T>> {
    try {
      this.loggerService.trace("getConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      const conversation = await this.get<Conversation<ConversationType<T>>>({ Key: { pk: conversationId, sk: conversationId } }, "Conversation");

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateConversation<T extends ConversationId>(params: UpdateConversationInput<T>): Promise<UpdateConversationOutput<T>> {
    try {
      this.loggerService.trace("updateConversation called", { params }, this.constructor.name);

      const { conversationId, updates } = params;

      const conversation = await this.partialUpdate<Conversation<ConversationType<T>>>(
        conversationId,
        conversationId,
        updates as RecursivePartial<CleansedEntity<Conversation<ConversationType<T>>>>,
      );

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteConversation(params: DeleteConversationInput): Promise<DeleteConversationOutput> {
    try {
      this.loggerService.trace("deleteConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: conversationId, sk: conversationId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversations<T extends ConversationId>(params: GetConversationsInput<T>): Promise<GetConversationsOutput<T>> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { conversationIds } = params;

      const conversations = await this.batchGet<Conversation<ConversationType<T>>>({ Keys: conversationIds.map((conversationId) => ({ pk: conversationId, sk: conversationId })) });

      return { conversations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByTeamId<T extends ConversationType>(params: GetConversationsByTeamIdInput<T>): Promise<GetConversationsByTeamIdOutput<T>> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { teamId, type, exclusiveStartKey, limit } = params;

      const typeToSkPrefixMap = {
        [ConversationTypeEnum.Friend]: KeyPrefix.FriendConversation,
        [ConversationTypeEnum.Group]: KeyPrefix.GroupConversation,
        [ConversationTypeEnum.Meeting]: KeyPrefix.MeetingConversation,
      };

      const skPrefix = type ? typeToSkPrefixMap[type] : KeyPrefix.Conversation;

      const { Items: conversations, LastEvaluatedKey } = await this.query<Conversation<T>>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": teamId,
          ":skPrefix": skPrefix,
        },
      });

      return {
        conversations,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private getEntityTypeByConversationType(conversationType: ConversationType): ConversationEntityType {
    try {
      this.loggerService.trace("getEntityTypeByConversationType called", { conversationType }, this.constructor.name);

      if (conversationType === ConversationTypeEnum.Friend) {
        return EntityType.FriendConversation;
      }

      if (conversationType === ConversationTypeEnum.Group) {
        return EntityType.GroupConversation;
      }

      return EntityType.MeetingConversation;
    } catch (error: unknown) {
      this.loggerService.error("Error in getEntityTypeByConversationType", { error, conversationType }, this.constructor.name);

      throw error;
    }
  }

  public convertRawConversationToConversation<T extends RawConversation<Conversation>>(params: ConvertRawConversationToConversationInput<T>): ConvertRawConversationToConversationOutput<T> {
    try {
      this.loggerService.trace("cleanseReactionsSet called", { params }, this.constructor.name);

      const { rawConversation } = params;

      const conversation = this.cleanse(rawConversation);

      return { conversation: conversation as ConversationTypeToConversation<T["type"]> };
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanseReactionsSet", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationRepositoryInterface {
  createConversation<T extends Conversation>(params: CreateConversationInput<T>): Promise<CreateConversationOutput<T>>;
  getConversation<T extends ConversationId>(params: GetConversationInput<T>): Promise<GetConversationOutput<T>>;
  updateConversation<T extends ConversationId>(params: UpdateConversationInput<T>): Promise<UpdateConversationOutput<T>>;
  getConversations<T extends ConversationId>(params: GetConversationsInput<T>): Promise<GetConversationsOutput<T>>;
  deleteConversation(params: DeleteConversationInput): Promise<DeleteConversationOutput>;
  getConversationsByTeamId<T extends ConversationType>(params: GetConversationsByTeamIdInput<T>): Promise<GetConversationsByTeamIdOutput<T>>;
  convertRawConversationToConversation<T extends RawConversation<Conversation>>(params: ConvertRawConversationToConversationInput<T>): ConvertRawConversationToConversationOutput<T>;
}

type ConversationRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface BaseConversation<T extends ConversationTypeEnum> {
  id: ConversationId<T>;
  type: T;
  createdBy: UserId;
  createdAt: string;
  teamId?: TeamId;
}

type ConversationEntityType = EntityType.FriendConversation | EntityType.GroupConversation | EntityType.MeetingConversation;

export type FriendConversation = BaseConversation<ConversationTypeEnum.Friend>;

export interface GroupConversation extends BaseConversation<ConversationTypeEnum.Group> {
  name: string;
  imageMimeType: ImageMimeType;
}

export interface MeetingConversation extends BaseConversation<ConversationTypeEnum.Meeting> {
  name: string;
  imageMimeType: ImageMimeType;
  dueDate: string;
  outcomes?: string;
}

export type Conversation<T extends ConversationType | void = void> =
  T extends ConversationTypeEnum.Friend ? FriendConversation :
    T extends ConversationTypeEnum.Group ? GroupConversation :
      T extends ConversationTypeEnum.Meeting ? MeetingConversation :
        FriendConversation | GroupConversation | MeetingConversation;

export type RawConversation<T extends Conversation> = T & {
  entityType: ConversationEntityType,
  pk: ConversationId;
  sk: ConversationId;
  gsi1pk?: TeamId;
  gsi1sk?: ConversationId;
};

export interface CreateConversationInput<T extends Conversation> {
  conversation: T;
}

export interface CreateConversationOutput<T extends Conversation> {
  conversation: T;
}
export interface GetConversationInput<T extends ConversationId> {
  conversationId: T;
}

export interface GetConversationOutput<T extends ConversationId> {
  conversation: Conversation<ConversationType<T>>;
}

export type ConversationUpdates<T extends ConversationType> =
  Conversation<T> extends GroupConversation
    ? Partial<Pick<Conversation<T>, "imageMimeType" | "name">> : Conversation<T> extends MeetingConversation
      ? Partial<Pick<MeetingConversation, "imageMimeType" | "name" | "outcomes">> : Record<string, unknown>;

export interface UpdateConversationInput<T extends ConversationId> {
  conversationId: T;
  updates: ConversationUpdates<ConversationType<T>>;
}

export interface UpdateConversationOutput<T extends ConversationId> {
  conversation: Conversation<ConversationType<T>>;
}

export interface DeleteConversationInput {
  conversationId: ConversationId;
}

export type DeleteConversationOutput = void;

export interface GetConversationsInput<T extends ConversationId> {
  conversationIds: T[];
}

export interface GetConversationsOutput<T extends ConversationId> {
  conversations: Conversation<ConversationType<T>>[];
}

export interface GetConversationsByTeamIdInput<T extends ConversationType> {
  teamId: TeamId;
  type?: T;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput<T extends ConversationType> {
  conversations: Conversation<T>[];
  lastEvaluatedKey?: string;
}

type ConversationTypeToConversation<T extends ConversationType> =
  T extends ConversationTypeEnum.Friend ? FriendConversation :
    T extends ConversationTypeEnum.Group ? GroupConversation : MeetingConversation;

export interface ConvertRawConversationToConversationInput<T extends RawConversation<Conversation>> {
  rawConversation: T;

}

export interface ConvertRawConversationToConversationOutput<T extends RawConversation<Conversation>> {
  conversation: ConversationTypeToConversation<T["type"]>;
}
