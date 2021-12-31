import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MessageId } from "@yac/util/src/types/messageId.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { Message } from "./message.dynamo.repository";

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
        sk: EntityType.PendingMessage,
        ...pendingMessage,
      };

      await this.documentClient.put({
        ConditionExpression: "attribute_not_exists(pk)",
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

      const { messageId } = params;

      const pendingMessage = await this.get({ Key: { pk: messageId, sk: EntityType.PendingMessage } }, "Pending Message");

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updatePendingMessage(params: UpdatePendingMessageInput): Promise<UpdatePendingMessageOutput> {
    try {
      this.loggerService.trace("updatePendingMessage called", { params }, this.constructor.name);

      const { messageId, updates } = params;

      const pendingMessage = await this.partialUpdate(messageId, EntityType.PendingMessage, updates);

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in updatePendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deletePendingMessage(params: DeletePendingMessageInput): Promise<DeletePendingMessageOutput> {
    try {
      this.loggerService.trace("deletePendingMessage called", { params }, this.constructor.name);

      const { messageId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: messageId, sk: EntityType.PendingMessage },
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

export type PendingMessage = Pick<Message, "id" | "conversationId" | "from" | "createdAt" | "mimeType" | "replyTo" | "title">;

export interface RawPendingMessage extends PendingMessage {
  entityType: EntityType.PendingMessage;
  pk: MessageId;
  sk: EntityType.PendingMessage;
}

export interface CreatePendingMessageInput {
  pendingMessage: PendingMessage;
}

export interface CreatePendingMessageOutput {
  pendingMessage: PendingMessage;
}

export interface GetPendingMessageInput {
  messageId: MessageId;
}

export interface GetPendingMessageOutput {
  pendingMessage: PendingMessage;
}

export type PendingMessageUpdates = Partial<Pick<PendingMessage, "mimeType">>;

export interface UpdatePendingMessageInput {
  messageId: MessageId;
  updates: PendingMessageUpdates;
}

export interface UpdatePendingMessageOutput {
  pendingMessage: PendingMessage;
}

export interface DeletePendingMessageInput {
  messageId: MessageId;
}

export type DeletePendingMessageOutput = void;
