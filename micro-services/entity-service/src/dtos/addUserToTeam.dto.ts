import { Record } from "runtypes";
import { Role } from "../runtypes/role.runtype";
import { TeamId } from "../runtypes/teamId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const AddUserToTeamDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  body: Record({
    userId: UserId,
    role: Role,
  }),
});
