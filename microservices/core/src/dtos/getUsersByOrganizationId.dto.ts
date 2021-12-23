import { Optional, Record, String } from "runtypes";
import { OrganizationId } from "../runtypes/organizationId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetUsersByOrganizationIdDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  queryStringParameters: Record({ searchTerm: Optional(String), exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
