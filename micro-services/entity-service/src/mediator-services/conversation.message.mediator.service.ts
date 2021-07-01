import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationUserRelationshipServiceInterface } from "../services/conversationUserRelationship.service";
import { Message } from "../models/message.model";
import { MessageServiceInterface } from "../services/message.service";

@injectable()
export class ConversationMessageMediatorService implements ConversationMessageMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async sendMessage(params: SendMessageInput): Promise<SendMessageOutput> {
    try {
      this.loggerService.trace("sendMessage called", { params }, this.constructor.name);

      const { conversationId, from, transcript } = params;

      const timestamp = new Date().toISOString();

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId });

      const seenAt = conversationUserRelationships.reduce((acc: { [key: string]: string | null; }, relationship) => {
        acc[relationship.userId] = relationship.userId === from ? timestamp : null;

        return acc;
      }, {});

      const { message } = await this.messageService.createMessage({ conversationId, from, transcript, seenAt });

      await Promise.all(conversationUserRelationships.map((relationship) => this.conversationUserRelationshipService.addMessageToConversationUserRelationship({
        conversationId,
        userId: relationship.userId,
        messageId: message.id,
        sender: relationship.userId === from,
      })));

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async markMessageRead(params: MarkMessageReadInput): Promise<MarkMessageReadOutput> {
    try {
      this.loggerService.trace("markMessageRead called", { params }, this.constructor.name);

      const { userId, messageId } = params;

      const { message } = await this.messageService.updateMessageSeenAt({ messageId, userId, seenAtValue: new Date().toISOString() });

      await this.conversationUserRelationshipService.removeUnreadMessageFromConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in markMessageRead", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async markMessageUnread(params: MarkMessageUnreadInput): Promise<MarkMessageUnreadOutput> {
    try {
      this.loggerService.trace("markMessageUnread called", { params }, this.constructor.name);

      const { userId, messageId } = params;

      const { message } = await this.messageService.updateMessageSeenAt({ messageId, userId, seenAtValue: null });

      await this.conversationUserRelationshipService.addMessageToConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in markMessageUnread", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async markConversationRead(params: MarkConversationReadInput): Promise<MarkConversationReadOutput> {
    try {
      this.loggerService.trace("markConversationRead called", { params }, this.constructor.name);

      const { userId, conversationId } = params;

      const { conversationUserRelationship: { unreadMessages = [] } } = await this.conversationUserRelationshipService.getConversationUserRelationship({ conversationId, userId });

      await Promise.all(unreadMessages.map((messageId) => this.markMessageRead({ userId, messageId })));
    } catch (error: unknown) {
      this.loggerService.error("Error in markConversationRead", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationMessageMediatorServiceInterface {
  sendMessage(params: SendMessageInput): Promise<SendMessageOutput>;
  markMessageRead(params: MarkMessageReadInput): Promise<MarkMessageReadOutput>;
  markMessageUnread(params: MarkMessageUnreadInput): Promise<MarkMessageUnreadOutput>;
  markConversationRead(params: MarkConversationReadInput): Promise<MarkConversationReadOutput>;
}

export interface SendMessageInput {
  conversationId: string;
  from: string;
  transcript: string;
}

export interface SendMessageOutput {
  message: Message;
}

export interface MarkMessageReadInput {
  userId: string;
  messageId: string;
}

export interface MarkMessageReadOutput {
  message: Message;
}

export interface MarkMessageUnreadInput {
  userId: string;
  messageId: string;
}

export interface MarkMessageUnreadOutput {
  message: Message;
}

export interface MarkConversationReadInput {
  userId: string;
  conversationId: string;
}

export type MarkConversationReadOutput = void;
