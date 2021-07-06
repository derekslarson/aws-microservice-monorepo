import { Record } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const GetMessagesByByMeetingIdDto = Record({ pathParameters: Record({ meetingId: MeetingId }) });
