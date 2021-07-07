import { Optional, Record, String } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const GetMessagesByByMeetingIdDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String) }),
});
