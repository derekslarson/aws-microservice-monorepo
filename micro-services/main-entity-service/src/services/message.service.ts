import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { MessageRepositoryInterface } from "../repositories/message.dynamo.repository";
import { Message } from "../models/message/message.model";

@injectable()
export class MessageService implements MessageServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageRepositoryInterface) private messageRepository: MessageRepositoryInterface,
  ) {}

  public async createMessage(messageCreationInput: Omit<Message, "id" | "seenAt" | "sentAt" | "reactions" | "hasReplies">): Promise<Message> {
    try {
      this.loggerService.trace("createMessage called", { messageCreationInput }, this.constructor.name);

      const messageCreationBody: Omit<Message, "id" | "seenAt"> = {
        ...messageCreationInput,
        sentAt: new Date().toISOString(),
        reactions: {},
        hasReplies: false,
      };

      const message = await this.messageRepository.createMessage(messageCreationBody);

      return message;
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, messageCreationInput }, this.constructor.name);

      throw error;
    }
  }

  public async getMessage(messageId: string): Promise<Message> {
    try {
      this.loggerService.trace("getMessage called", { messageId }, this.constructor.name);

      const message = await this.messageRepository.getMessage(messageId);

      return message;
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessage", { error, messageId }, this.constructor.name);

      throw error;
    }
  }

  public async updateMessage(messageId: string, update: Partial<Message>): Promise<void> {
    try {
      this.loggerService.trace("updateMessage called", { messageId, update }, this.constructor.name);

      await this.messageRepository.updateMessage(messageId, update);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMessage", { error, messageId, update }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesByConversationId(userId: string): Promise<Message[]> {
    try {
      this.loggerService.trace("getMessagesByConversationId called", { userId }, this.constructor.name);

      const { messages } = await this.messageRepository.getMessagesByConversationId(userId);

      return messages;
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesByConversationId", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getRepliesByMessageId(userId: string): Promise<Message[]> {
    try {
      this.loggerService.trace("getRepliesByMessageId called", { userId }, this.constructor.name);

      const { replies } = await this.messageRepository.getRepliesByMessageId(userId);

      return replies;
    } catch (error: unknown) {
      this.loggerService.error("Error in getRepliesByMessageId", { error, userId }, this.constructor.name);

      throw error;
    }
  }
}

export interface MessageServiceInterface {
  createMessage(messageCreationInput: Omit<Message, "id" | "sentAt" | "reactions" | "hasReplies">): Promise<Message>;
  updateMessage(messageId: string, update: Partial<Message>): Promise<void>;
  getMessage(messageId: string): Promise<Message>;
  getMessagesByConversationId(userId: string): Promise<Message[]>;
  getRepliesByMessageId(userId: string): Promise<Message[]>;
}
