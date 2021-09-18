/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface, MessageFileRepositoryInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { PendingMessageRepositoryInterface, PendingMessage as PendingMessageEntity, PendingMessageUpdates } from "../repositories/pendingMessage.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";
import { ConversationId } from "../types/conversationId.type";
import { PendingMessageId } from "../types/pendingMessageId.type";
import { MessageMimeType } from "../enums/message.mimeType.enum";
import { MessageId } from "../types/messageId.type";

@injectable()
export class PendingMessageService implements PendingMessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.RawMessageFileRepositoryInterface) private rawMessageFileRepository: MessageFileRepositoryInterface,
    @inject(TYPES.PendingMessageRepositoryInterface) private pendingMessageRepository: PendingMessageRepositoryInterface,
  ) {}

  public async createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput> {
    try {
      this.loggerService.trace("createPendingMessage called", { params }, this.constructor.name);

      const { conversationId, from, mimeType } = params;

      const pendingMessageId: PendingMessageId = `${KeyPrefix.PendingMessage}${this.idService.generateId()}`;

      const pendingMessageEntity: PendingMessageEntity = {
        id: pendingMessageId,
        conversationId,
        from,
        mimeType,
        createdAt: new Date().toISOString(),
      };

      await this.pendingMessageRepository.createPendingMessage({ pendingMessage: pendingMessageEntity });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId });

      const { signedUrl } = this.rawMessageFileRepository.getMessageSignedUrl({
        messageId,
        conversationId,
        mimeType,
        operation: "upload",
      });

      const pendingMessage = {
        ...pendingMessageEntity,
        uploadUrl: signedUrl,
      };

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

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageRepository.getPendingMessage({ pendingMessageId });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId });

      const { signedUrl } = this.rawMessageFileRepository.getMessageSignedUrl({
        messageId,
        conversationId: pendingMessageEntity.conversationId,
        mimeType: pendingMessageEntity.mimeType,
        operation: "upload",
      });

      const pendingMessage = {
        ...pendingMessageEntity,
        uploadUrl: signedUrl,
      };

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

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageRepository.updatePendingMessage({ pendingMessageId, updates });

      const { messageId } = this.convertPendingToRegularMessageId({ pendingMessageId });

      const { signedUrl } = this.rawMessageFileRepository.getMessageSignedUrl({
        messageId,
        conversationId: pendingMessageEntity.conversationId,
        mimeType: pendingMessageEntity.mimeType,
        operation: "upload",
      });

      const pendingMessage = {
        ...pendingMessageEntity,
        uploadUrl: signedUrl,
      };

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

      await this.pendingMessageRepository.deletePendingMessage({ pendingMessageId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deletePendingMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private convertPendingToRegularMessageId(params: ConvertPendingToRegularMessageIdInput): ConvertPendingToRegularMessageIdOutput {
    try {
      this.loggerService.trace("convertPendingToRegularMessageId called", { params }, this.constructor.name);

      const { pendingMessageId } = params;

      const messageId = pendingMessageId.replace(KeyPrefix.PendingMessage, KeyPrefix.Message) as MessageId;

      return { messageId };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertPendingToRegularMessageId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface PendingMessageServiceInterface {
  createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput>;
  getPendingMessage(params: GetPendingMessageInput): Promise<GetPendingMessageOutput>;
  updatePendingMessage(params: UpdatePendingMessageInput): Promise<UpdatePendingMessageOutput>;
  deletePendingMessage(params: DeletePendingMessageInput): Promise<DeletePendingMessageOutput>;
}

export interface PendingMessage extends PendingMessageEntity {
  uploadUrl: string;
}

export interface CreatePendingMessageInput {
  conversationId: ConversationId;
  from: UserId;
  mimeType: MessageMimeType;
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

interface ConvertPendingToRegularMessageIdInput {
  pendingMessageId: PendingMessageId;
}

interface ConvertPendingToRegularMessageIdOutput {
  messageId: MessageId;
}
