import { Literal, Optional, Record, String, Union } from "runtypes";
import { OrganizationId } from "../runtypes/organizationId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMeetingsByOrganizationIdDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  queryStringParameters: Record({
    sortBy: Optional(Union(Literal("dueAt"), Literal("activeAt"))),
    searchTerm: Optional(String),
    exclusiveStartKey: Optional(String),
    limit: Optional(Limit),
  }),
});
