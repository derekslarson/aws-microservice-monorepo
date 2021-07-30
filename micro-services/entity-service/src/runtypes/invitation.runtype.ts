import { Record, String, Union } from "runtypes";
import { Email } from "./email.runtype";
import { Phone } from "./phone.runtype";
import { Role } from "./role.runtype";

const EmailInvite = Record({ email: Email });

const EmailInviteWithRole = Record({
  email: Email,
  role: Role,
});

const PhoneInvite = Record({ phone: Phone });

const PhoneInviteWithRole = Record({
  phone: Phone,
  role: Role,
});

const UsernameInvite = Record({ username: String });

const UsernameInviteWithRole = Record({
  username: String,
  role: Role,
});

export const Invitation = Union(EmailInvite, PhoneInvite, UsernameInvite);

export const InvitationWithRole = Union(EmailInviteWithRole, PhoneInviteWithRole, UsernameInviteWithRole);
