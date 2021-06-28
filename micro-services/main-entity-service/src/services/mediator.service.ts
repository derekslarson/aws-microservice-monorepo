import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Message } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { MessageServiceInterface } from "./message.service";
import { UserServiceInterface } from "./user.service";

@injectable()
export class MediatorService implements MediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
  ) {}

  public async createMessage(messageCreationInput: Omit<Message, "id" | "sentAt" | "seenAt" | "reactions" | "hasReplies">): Promise<Message> {
    try {
      this.loggerService.trace("createMessage called", { messageCreationInput }, this.constructor.name);

      const conversationMembers = await this.userService.getUsersByConversationId(messageCreationInput.conversationId);

      const seenAt = conversationMembers.reduce((acc: { [key: string]: string | null }, member) => {
        acc[member.id] = member.id === messageCreationInput.from ? new Date().toISOString() : null;

        return acc;
      }, {});

      const messageCreationBody: Omit<Message, "id" | "sentAt" | "reactions" | "hasReplies"> = {
        ...messageCreationInput,
        seenAt,
      };

      const message = await this.messageService.createMessage(messageCreationBody);

      return message;
    } catch (error: unknown) {
      this.loggerService.error("Error in createMessage", { error, messageCreationInput }, this.constructor.name);

      throw error;
    }
  }
}

export interface MediatorServiceInterface {
  createMessage(messageCreationInput: Omit<Message, "id" | "seenAt" | "sentAt" | "reactions" | "hasReplies">): Promise<Message>;
}
