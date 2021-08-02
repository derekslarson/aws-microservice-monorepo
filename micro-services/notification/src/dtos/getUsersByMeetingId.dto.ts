import { Optional, Record, String } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetUsersByMeetingIdDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
