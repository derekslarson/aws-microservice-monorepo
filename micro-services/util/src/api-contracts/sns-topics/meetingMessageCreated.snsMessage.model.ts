import { Message } from "../business-objects/message.model";
import { UserId } from "../../types/userId.type";

export type MeetingMessageCreatedSnsMessage = {
  meetingMemberIds: UserId[];
  message: Message;
};
