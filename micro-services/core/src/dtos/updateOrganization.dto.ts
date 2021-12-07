import { Record, String } from "runtypes";
import { OrganizationId } from "../runtypes/organizationId.runtype";

export const UpdateOrganizationDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  body: Record({ name: String }),
});
