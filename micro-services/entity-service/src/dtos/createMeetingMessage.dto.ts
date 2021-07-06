import { Record, String } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const CreateMeetingMessageDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  body: Record({ transcript: String }),
});
