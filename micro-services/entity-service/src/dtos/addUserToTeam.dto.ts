import { Role } from "@yac/core";
import { Literal, Record, String, Union } from "runtypes";

export const AddUserToTeamDto = Record({
  pathParameters: Record({ teamId: String }),
  queryStringParameters: Record({}),
  body: Record({
    userId: String,
    role: Union(Literal(Role.SuperAdmin), Literal(Role.Admin), Literal(Role.User)),
  }),
});
