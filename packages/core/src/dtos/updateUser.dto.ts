import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const UpdateUserDto = Record({
  pathParameters: Record({ userId: UserId }),
  body: Record({
    name: Optional(String),
    bio: Optional(String),
  }),
});
