import { Record, Array } from "runtypes";
import { InvitationWithRole } from "../runtypes/invitation.runtype";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const AddUsersToMeetingDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  body: Record({ users: Array(InvitationWithRole) }),
});
