import { Optional, Record, String } from "runtypes";
import { OrganizationId } from "../runtypes/organizationId.runtype";
import { TeamId } from "../runtypes/teamId.runtype";

export const CreateGroupDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  body: Record({ name: String, teamId: Optional(TeamId) }),
});
