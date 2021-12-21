import { Optional, Record, String } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetGroupsByTeamIdDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
