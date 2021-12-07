import { Record } from "runtypes";
import { OrganizationId } from "../runtypes/organizationId.runtype";

export const GetOrganizationDto = Record({ pathParameters: Record({ organizationId: OrganizationId }) });
