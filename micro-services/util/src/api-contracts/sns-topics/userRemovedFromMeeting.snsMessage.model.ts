import { Meeting } from "../business-objects/meeting.model";
import { User } from "../business-objects/user.model";

export type UserRemovedFromMeetingSnsMessage = {
  meetingMemberIds: string[];
  meeting: Meeting;
  user: User;
};
