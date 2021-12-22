import { Optional, Record, String } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMeetingsByTeamIdDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  queryStringParameters: Record({ searchTerm: Optional(String), exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
