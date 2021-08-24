import { User } from "../business-objects/user.model";
import { Message } from "../business-objects/message.model";

export type FriendMessageCreatedSnsMessage = {
  to: User;
  from: User;
  message: Message;
};
