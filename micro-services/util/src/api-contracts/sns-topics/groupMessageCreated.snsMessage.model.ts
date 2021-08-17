import { User } from "../business-objects/user.model";
import { Message } from "../business-objects/message.model";

export type GroupMessageCreatedSnsMessage = {
  group: User;
  from: User;
  message: Message;
};
