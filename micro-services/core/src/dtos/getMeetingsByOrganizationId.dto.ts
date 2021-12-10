import { Optional, Record, String } from "runtypes";
import { OrganizationId } from "../runtypes/organizationId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMeetingsByOrganizationIdDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
