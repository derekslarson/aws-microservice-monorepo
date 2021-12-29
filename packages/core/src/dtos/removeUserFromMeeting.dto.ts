import { Record } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const RemoveUserFromMeetingDto = Record({ pathParameters: Record({ meetingId: MeetingId, userId: UserId }) });
