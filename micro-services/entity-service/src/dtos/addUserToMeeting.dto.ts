import { Record } from "runtypes";
import { MeetingId } from "../runtypes/meetingId.runtype";
import { Role } from "../runtypes/role.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const AddUserToMeetingDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  body: Record({
    userId: UserId,
    role: Role,
  }),
});
