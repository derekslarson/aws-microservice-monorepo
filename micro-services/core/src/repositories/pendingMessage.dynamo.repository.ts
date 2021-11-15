import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { PendingMessageId } from "../types/pendingMessageId.type";
import { ConversationId } from "../types/conversationId.type";
import { UserId } from "../types/userId.type";
import { MessageId } from "../types/messageId.type";
import { MessageMimeType } from "../enums/message.mimeType.enum";

@injectable()
export class PendingMessageDynamoRepository extends BaseDynamoRepositoryV2<PendingMessage> implements PendingMessageRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: PendingMessageRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput> {
    try {
      this.loggerService.trace("createPendingMessage called", { params }, this.constructor.name);

      const { pendingMessage } = params;

      const pendingMessageEntity: RawPendingMessage = {
        entityType: EntityType.PendingMessage,
        pk: pendingMessage.id,
        sk: pendingMessage.id,
        ...pendingMessage,
      };

      await this.documentClient.put({
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        TableName: this.tableName,
        Item: pendingMessageEntity,
      }).promise();

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in createPendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getPendingMessage(params: GetPendingMessageInput): Promise<GetPendingMessageOutput> {
    try {
      this.loggerService.trace("getPendingMessage called", { params }, this.constructor.name);

      const { pendingMessageId } = params;

      const pendingMessage = await this.get({ Key: { pk: pendingMessageId, sk: pendingMessageId } }, "Pending Message");

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updatePendingMessage(params: UpdatePendingMessageInput): Promise<UpdatePendingMessageOutput> {
    try {
      this.loggerService.trace("updatePendingMessage called", { params }, this.constructor.name);

      const { pendingMessageId, updates } = params;

      const pendingMessage = await this.partialUpdate(pendingMessageId, pendingMessageId, updates);

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in updatePendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deletePendingMessage(params: DeletePendingMessageInput): Promise<DeletePendingMessageOutput> {
    try {
      this.loggerService.trace("deletePendingMessage called", { params }, this.constructor.name);

      const { pendingMessageId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: pendingMessageId, sk: pendingMessageId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deletePendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface PendingMessageRepositoryInterface {
  createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput>;
  getPendingMessage(params: GetPendingMessageInput): Promise<GetPendingMessageOutput>;
  updatePendingMessage(params: UpdatePendingMessageInput): Promise<UpdatePendingMessageOutput>;
  deletePendingMessage(params: DeletePendingMessageInput): Promise<DeletePendingMessageOutput>;
}

type PendingMessageRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface PendingMessage {
  id: PendingMessageId;
  conversationId: ConversationId;
  from: UserId;
  createdAt: string;
  mimeType: MessageMimeType;
  replyTo?: MessageId;
  title?: string;
}

export interface RawPendingMessage extends PendingMessage {
  entityType: EntityType.PendingMessage;
  pk: PendingMessageId;
  sk: PendingMessageId;
}

export interface CreatePendingMessageInput {
  pendingMessage: PendingMessage;
}

export interface CreatePendingMessageOutput {
  pendingMessage: PendingMessage;
}

export interface GetPendingMessageInput {
  pendingMessageId: PendingMessageId;
}

export interface GetPendingMessageOutput {
  pendingMessage: PendingMessage;
}

export type PendingMessageUpdates = Partial<Pick<PendingMessage, "mimeType">>;
export interface UpdatePendingMessageInput {
  pendingMessageId: PendingMessageId;
  updates: PendingMessageUpdates;
}

export interface UpdatePendingMessageOutput {
  pendingMessage: PendingMessage;
}

export interface DeletePendingMessageInput {
  pendingMessageId: PendingMessageId;
}

export type DeletePendingMessageOutput = void;
