import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const UpdateUserByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  body: Record({
    realName: Optional(String),
    bio: Optional(String),
  }),
});
