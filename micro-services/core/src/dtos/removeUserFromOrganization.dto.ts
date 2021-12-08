import { Record } from "runtypes";
import { OrganizationId } from "../runtypes/organizationId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const RemoveUserFromOrganizationDto = Record({ pathParameters: Record({ organizationId: OrganizationId, userId: UserId }) });
