import { Record, Array, Union, String } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";
import { Role } from "../runtypes/role.runtype";
import { TeamId } from "../runtypes/teamId.runtype";

const EmailInvite = Record({
  email: Email,
  role: Role,
});

const PhoneInvite = Record({
  phone: Phone,
  role: Role,
});

const UsernameInvite = Record({
  username: String,
  role: Role,
});

export const AddUsersToTeamDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  body: Record({ users: Array(Union(EmailInvite, PhoneInvite, UsernameInvite)) }),
});
