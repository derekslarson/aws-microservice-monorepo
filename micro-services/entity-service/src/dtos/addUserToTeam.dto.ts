import { Record } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Role } from "../runtypes/role.runtype";
import { TeamId } from "../runtypes/teamId.runtype";

export const AddUserToTeamDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  body: Record({
    email: Email,
    role: Role,
  }),
});
