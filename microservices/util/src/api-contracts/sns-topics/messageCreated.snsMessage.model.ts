import { Message } from "../business-objects/message.model";
import { UserId } from "../../types/userId.type";

export type MessageCreatedSnsMessage = {
  conversationMemberIds: UserId[];
  message: Message;
};
