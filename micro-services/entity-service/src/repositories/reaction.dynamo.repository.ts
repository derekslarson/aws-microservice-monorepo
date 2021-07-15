import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";
import { MessageId } from "../types/messageId.type";
import { UserId } from "../types/userId.type";
import { ReactionId } from "../types/reactionId.type";

@injectable()
export class ReactionDynamoRepository extends BaseDynamoRepositoryV2<Reaction> implements ReactionRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ReactionRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createReaction(params: CreateReactionInput): Promise<CreateReactionOutput> {
    try {
      this.loggerService.trace("createReaction called", { params }, this.constructor.name);

      const { reaction } = params;

      const reactionEntity: RawReaction = {
        entityType: EntityType.Reaction,
        pk: reaction.messageId,
        sk: `${KeyPrefix.Reaction}${reaction.type}-${reaction.userId}` as ReactionId,
        ...reaction,
      };

      await this.documentClient.put({
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        TableName: this.tableName,
        Item: reactionEntity,
      }).promise();

      return { reaction };
    } catch (error: unknown) {
      this.loggerService.error("Error in createReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteReaction(params: DeleteReactionInput): Promise<DeleteReactionOutput> {
    try {
      this.loggerService.trace("deleteReaction called", { params }, this.constructor.name);

      const { messageId, userId, type } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: messageId, sk: `${KeyPrefix.Reaction}${type}-${userId}` },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteReaction", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getReactionsByMessageId(params: GetReactionsByMessageIdInput): Promise<GetReactionsByMessageIdOutput> {
    try {
      this.loggerService.trace("getReactionsByMessageId called", { params }, this.constructor.name);

      const { messageId, exclusiveStartKey, limit, type = "" } = params;

      const { Items: reactions, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :reaction)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": messageId,
          ":reaction": `${KeyPrefix.Reaction}${type}`,
        },
      });

      return {
        reactions,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getReactionsByMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ReactionRepositoryInterface {
  createReaction(params: CreateReactionInput): Promise<CreateReactionOutput>;
  deleteReaction(params: DeleteReactionInput): Promise<DeleteReactionOutput>;
  getReactionsByMessageId(params: GetReactionsByMessageIdInput): Promise<GetReactionsByMessageIdOutput>;
}

type ReactionRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Reaction {
  messageId: MessageId;
  userId: UserId;
  type: string;
  createdAt: string;
}

export interface RawReaction extends Reaction {
  entityType: EntityType.Reaction,
  pk: MessageId;
  sk: ReactionId;
}

export interface CreateReactionInput {
  reaction: Reaction;
}

export interface CreateReactionOutput {
  reaction: Reaction;
}

export interface DeleteReactionInput {
  messageId: MessageId;
  userId: UserId;
  type: string;
}

export type DeleteReactionOutput = void;

export interface GetReactionsByMessageIdInput {
  messageId: MessageId;
  type?: string;
  exclusiveStartKey?: string;
  limit?: number;
}

export interface GetReactionsByMessageIdOutput {
  reactions: Reaction[];
  lastEvaluatedKey?: string;
}
