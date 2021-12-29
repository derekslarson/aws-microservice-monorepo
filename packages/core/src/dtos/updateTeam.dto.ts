import { Record, String } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";

export const UpdateTeamDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  body: Record({ name: String }),
});
