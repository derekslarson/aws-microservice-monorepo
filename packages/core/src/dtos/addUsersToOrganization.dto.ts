import { Record, Array } from "runtypes";
import { InvitationWithRole } from "../runtypes/invitation.runtype";
import { OrganizationId } from "../runtypes/organizationId.runtype";

export const AddUsersToOrganizationDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  body: Record({ users: Array(InvitationWithRole) }),
});
