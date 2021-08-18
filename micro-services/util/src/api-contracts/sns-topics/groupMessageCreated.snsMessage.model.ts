import { Group } from "../business-objects/group.model";
import { User } from "../business-objects/user.model";
import { Message } from "../business-objects/message.model";
import { UserId } from "../types/userId.type";

export type GroupMessageCreatedSnsMessage = {
  groupMemberIds: UserId[];
  to: Group;
  from: User;
  message: Message;
};
