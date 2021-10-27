import { Meeting } from "../business-objects";
import { UserId } from "../../types/userId.type";

export type MeetingCreatedSnsMessage = {
  meeting: Meeting,
  meetingMemberIds: UserId[];
};
