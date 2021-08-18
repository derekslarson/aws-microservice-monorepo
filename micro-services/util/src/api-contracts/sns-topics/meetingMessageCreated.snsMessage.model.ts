import { Meeting } from "../business-objects/meeting.model";
import { User } from "../business-objects/user.model";
import { Message } from "../business-objects/message.model";
import { UserId } from "../types/userId.type";

export type MeetingMessageCreatedSnsMessage = {
  meetingMemberIds: UserId[];
  to: Meeting;
  from: User;
  message: Message;
};
