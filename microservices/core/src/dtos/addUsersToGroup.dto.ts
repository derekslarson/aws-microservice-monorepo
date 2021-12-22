import { Record, Array } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { InvitationWithRole } from "../runtypes/invitation.runtype";

export const AddUsersToGroupDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  body: Record({ users: Array(InvitationWithRole) }),
});
