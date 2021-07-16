import { Record } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";
import { MimeType } from "../runtypes/mimeType.runtype";

export const CreateMeetingMessageDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  body: Record({ mimeType: MimeType }),
});
