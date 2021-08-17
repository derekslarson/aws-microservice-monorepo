import { User } from "../business-objects/user.model";
import { Message } from "../business-objects/message.model";

export type FriendMessageCreatedSnsMessage = {
  toUser: User;
  fromUser: User;
  message: Message;
};
