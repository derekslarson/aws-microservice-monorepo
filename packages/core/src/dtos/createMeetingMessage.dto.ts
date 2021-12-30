import { Record } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";
import { MessageMimeType } from "../runtypes/message.mimeType.runtype";

export const CreateMeetingMessageDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  body: Record({ mimeType: MessageMimeType }),
});
