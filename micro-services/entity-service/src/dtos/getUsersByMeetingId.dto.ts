import { Record } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const GetUsersByMeetingIdDto = Record({ pathParameters: Record({ meetingId: MeetingId }) });
