import { Role } from "@yac/core";
import { Literal, Record, String, Union } from "runtypes";

export const AddUserToTeamDto = Record({
  pathParameters: Record({ teamId: String }),
  body: Record({
    userId: String,
    role: Union(Literal(Role.SuperAdmin), Literal(Role.Admin), Literal(Role.User)),
  }),
});
