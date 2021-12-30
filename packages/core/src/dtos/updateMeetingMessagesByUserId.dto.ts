import { Optional, Record, Boolean } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const UpdateMeetingMessagesByUserIdDto = Record({
  pathParameters: Record({ userId: UserId, meetingId: MeetingId }),
  body: Record({ seen: Optional(Boolean) }),
});
