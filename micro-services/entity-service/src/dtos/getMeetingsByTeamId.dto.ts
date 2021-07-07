import { Optional, Record, String } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";

export const GetMeetingsByTeamIdDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String) }),
});
