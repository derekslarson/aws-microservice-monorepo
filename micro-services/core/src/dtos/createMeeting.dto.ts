import { Optional, Record, String } from "runtypes";
import { IsoTimestamp } from "../runtypes/isoTimestamp.runtype";
import { TeamId } from "../runtypes/teamId.runtype";
import { OrganizationId } from "../runtypes/organizationId.runtype";

export const CreateMeetingDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  body: Record({
    name: String,
    dueDate: IsoTimestamp,
    teamId: Optional(TeamId),
  }),
});
