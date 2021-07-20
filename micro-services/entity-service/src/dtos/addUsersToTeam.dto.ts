import { Record, Array, Optional } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";
import { Role } from "../runtypes/role.runtype";
import { TeamId } from "../runtypes/teamId.runtype";

export const AddUsersToTeamDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  body: Record({
    users: Array(Record({
      email: Optional(Email),
      phone: Optional(Phone),
      role: Role,
    })),
  }),
});
