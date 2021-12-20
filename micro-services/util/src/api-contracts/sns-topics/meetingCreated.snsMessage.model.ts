import { Meeting } from "../business-objects/meeting.model";
import { UserId } from "../../types/userId.type";

export type MeetingCreatedSnsMessage = {
  meeting: Meeting,
  meetingMemberIds: UserId[];
};
