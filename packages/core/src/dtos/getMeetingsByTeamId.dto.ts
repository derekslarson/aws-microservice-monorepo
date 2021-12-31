import { Literal, Optional, Record, String, Union } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMeetingsByTeamIdDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  queryStringParameters: Record({
    sortBy: Optional(Union(Literal("dueAt"), Literal("activeAt"))),
    searchTerm: Optional(String),
    exclusiveStartKey: Optional(String),
    limit: Optional(Limit),
  }),
});
