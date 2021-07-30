import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { PendingMessageRepositoryInterface, PendingMessage as PendingMessageEntity } from "../repositories/pendingMessage.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";
import { ConversationId } from "../types/conversationId.type";
import { PendingMessageId } from "../types/pendingMessageId.type";
import { MessageMimeType } from "../enums/message.mimeType.enum";

@injectable()
export class PendingMessageService implements PendingMessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.PendingMessageRepositoryInterface) private pendingMessageRepository: PendingMessageRepositoryInterface,
  ) {}

  public async createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput> {
    try {
      this.loggerService.trace("createPendingMessage called", { params }, this.constructor.name);

      const { conversationId, from, mimeType } = params;

      const pendingMessageId: PendingMessageId = `${KeyPrefix.PendingMessage}${this.idService.generateId()}`;

      const pendingMessage: PendingMessageEntity = {
        id: pendingMessageId,
        conversationId,
        from,
        mimeType,
        createdAt: new Date().toISOString(),
      };

      await this.pendingMessageRepository.createPendingMessage({ pendingMessage });

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

      const { pendingMessage } = await this.pendingMessageRepository.getPendingMessage({ pendingMessageId });

      return { pendingMessage };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPendingMessage", { error, params }, this.constructor.name);

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
}

export interface PendingMessageServiceInterface {
  createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput>;
  getPendingMessage(params: GetPendingMessageInput): Promise<GetPendingMessageOutput>;
  deletePendingMessage(params: DeletePendingMessageInput): Promise<DeletePendingMessageOutput>;
}

export type PendingMessage = PendingMessageEntity;

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

export interface DeletePendingMessageInput {
  pendingMessageId: PendingMessageId;
}

export type DeletePendingMessageOutput = void;
