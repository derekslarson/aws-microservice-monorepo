import { Record, Array } from "runtypes";
import { InvitationWithRole } from "../runtypes/invitation.runtype";
import { TeamId } from "../runtypes/teamId.runtype";

export const AddUsersToTeamDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  body: Record({ users: Array(InvitationWithRole) }),
});
