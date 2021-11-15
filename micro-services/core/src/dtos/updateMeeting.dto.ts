import { Optional, Record, String } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const UpdateMeetingDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  body: Record({ name: Optional(String), outcomes: Optional(String) }),
});
