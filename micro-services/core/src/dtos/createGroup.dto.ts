import { Optional, Record, String } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const CreateGroupDto = Record({
  pathParameters: Record({ userId: UserId }),
  body: Record({ name: String, teamId: Optional(TeamId) }),
});
