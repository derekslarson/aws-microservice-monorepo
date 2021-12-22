import { Optional, Record, String } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMessagesByMeetingIdDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  queryStringParameters: Record({ searchTerm: Optional(String), exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
