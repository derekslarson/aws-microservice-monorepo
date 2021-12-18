import { inject, injectable } from "inversify";
import { ConversationId, FileOperation, IdServiceInterface, LoggerServiceInterface, MessageFileRepositoryInterface, MessageId, MessageUploadTokenServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { PendingMessageRepositoryInterface, PendingMessage as PendingMessageEntity, PendingMessageUpdates } from "../repositories/pendingMessage.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageMimeType } from "../enums/message.mimeType.enum";

@injectable()
export class PendingMessageService implements PendingMessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.RawMessageFileRepositoryInterface) private rawMessageFileRepository: MessageFileRepositoryInterface,
    @inject(TYPES.PendingMessageRepositoryInterface) private pendingMessageRepository: PendingMessageRepositoryInterface,
    @inject(TYPES.MessageUploadTokenServiceInterface) private messageUploadTokenService: MessageUploadTokenServiceInterface,
  ) {}

  public async createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput> {
    try {
      this.loggerService.trace("createPendingMessage called", { params }, this.constructor.name);

      const { conversationId, from, mimeType } = params;

      const messageId: MessageId = `${KeyPrefix.Message}${this.idService.generateId()}`;

      const pendingMessageEntity: PendingMessageEntity = {
        id: messageId,
        conversationId,
        from,
        mimeType,
        createdAt: new Date().toISOString(),
      };

      await this.pendingMessageRepository.createPendingMessage({ pendingMessage: pendingMessageEntity });

      const { signedUrl } = this.rawMessageFileRepository.getSignedUrl({
        messageId,
        conversationId,
        mimeType,
        operation: FileOperation.Upload,
      });

      const { token: chunkedUploadToken } = await this.messageUploadTokenService.generateToken({ conversationId, messageId, mimeType });

      const pendingMessage = {
        ...pendingMessageEntity,
        uploadUrl: signedUrl,
        chunkedUploadToken,
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

      const { messageId } = params;

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageRepository.getPendingMessage({ messageId });

      const { signedUrl } = this.rawMessageFileRepository.getSignedUrl({
        messageId,
        conversationId: pendingMessageEntity.conversationId,
        mimeType: pendingMessageEntity.mimeType,
        operation: FileOperation.Upload,
      });

      const { token: chunkedUploadToken } = await this.messageUploadTokenService.generateToken({
        conversationId: pendingMessageEntity.conversationId,
        messageId,
        mimeType: pendingMessageEntity.mimeType,
      });

      const pendingMessage = {
        ...pendingMessageEntity,
        uploadUrl: signedUrl,
        chunkedUploadToken,
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

      const { messageId, updates } = params;

      const { pendingMessage: pendingMessageEntity } = await this.pendingMessageRepository.updatePendingMessage({ messageId, updates });

      const { signedUrl } = this.rawMessageFileRepository.getSignedUrl({
        messageId,
        conversationId: pendingMessageEntity.conversationId,
        mimeType: pendingMessageEntity.mimeType,
        operation: FileOperation.Upload,
      });

      const { token: chunkedUploadToken } = await this.messageUploadTokenService.generateToken({
        conversationId: pendingMessageEntity.conversationId,
        messageId,
        mimeType: pendingMessageEntity.mimeType,
      });

      const pendingMessage = {
        ...pendingMessageEntity,
        uploadUrl: signedUrl,
        chunkedUploadToken,
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

      const { messageId } = params;

      await this.pendingMessageRepository.deletePendingMessage({ messageId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deletePendingMessage", { error, params }, this.constructor.name);

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
  chunkedUploadToken: string;
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
  messageId: MessageId;
}

export interface GetPendingMessageOutput {
  pendingMessage: PendingMessage;
}

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
