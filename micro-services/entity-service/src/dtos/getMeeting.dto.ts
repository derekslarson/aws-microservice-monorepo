import { Record } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const GetMeetingDto = Record({ pathParameters: Record({ meetingId: MeetingId }) });
