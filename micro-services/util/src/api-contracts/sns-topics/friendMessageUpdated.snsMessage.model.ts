import { User } from "../business-objects/user.model";
import { Message } from "../business-objects/message.model";

export type FriendMessageUpdatedSnsMessage = {
  to: User;
  from: User;
  message: Message;
};
