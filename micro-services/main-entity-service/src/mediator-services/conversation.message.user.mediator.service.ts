import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface } from "../services/user.service";
import { ConversationUserRelationshipServiceInterface } from "../services/conversationUserRelationship.service";
import { Message } from "../models/message.model";
import { MessageServiceInterface } from "../services/message.service";

@injectable()
export class ConversationMessageUserMediatorService implements ConversationMessageUserMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
    try {
      this.loggerService.trace("createMessage called", { params }, this.constructor.name);

      const { conversationId, from, transcript } = params;

      const timestamp = new Date().toISOString();

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId });

      const seenAt = conversationUserRelationships.reduce((acc: { [key: string]: string | null; }, relationship) => {
        acc[relationship.userId] = relationship.userId === from ? timestamp : null;

        return acc;
      }, {});

      const { message } = await this.messageService.createMessage({ conversationId, from, transcript, seenAt });

      await Promise.all(conversationUserRelationships.map((relationship) => {
        if (relationship.userId === from) {
          return this.conversationUserRelationshipService.updateConversationUserRelationshipUpdatedAt({ conversationId, userId: relationship.userId });
        }

        return this.conversationUserRelationshipService.addUnreadMessageToConversationUserRelationship({ conversationId, userId: relationship.userId, messageId: message.id });
      }));

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async markMessageRead(params: MarkMessageReadInput): Promise<MarkMessageReadOutput> {
    try {
      this.loggerService.trace("markMessageRead called", { params }, this.constructor.name);

      const { userId, messageId } = params;

      const { message } = await this.messageService.updateMessageSeenAt({ messageId, userId, seenAtValue: new Date().toISOString() });

      await this.conversationUserRelationshipService.addUnreadMessageToConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });

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

      await this.conversationUserRelationshipService.removeUnreadMessageFromConversationUserRelationship({ conversationId: message.conversationId, userId, messageId });

      return { message };
    } catch (error: unknown) {
      this.loggerService.error("Error in markMessageUnread", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationMessageUserMediatorServiceInterface {
  createMessage(params: CreateMessageInput): Promise<CreateMessageOutput>;
  markMessageRead(params: MarkMessageReadInput): Promise<MarkMessageReadOutput>;
  markMessageUnread(params: MarkMessageUnreadInput): Promise<MarkMessageUnreadOutput>;
}

export interface CreateMessageInput {
  conversationId: string;
  from: string;
  transcript: string;
}

export interface CreateMessageOutput {
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
