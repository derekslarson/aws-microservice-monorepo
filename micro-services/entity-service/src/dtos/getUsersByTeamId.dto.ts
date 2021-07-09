import { Optional, Record, String } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetUsersByTeamIdDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Limit }),
});
