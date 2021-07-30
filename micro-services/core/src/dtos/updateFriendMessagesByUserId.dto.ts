import { Optional, Record, Boolean } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const UpdateFriendMessagesByUserIdDto = Record({
  pathParameters: Record({ userId: UserId, friendId: UserId }),
  body: Record({ seen: Optional(Boolean) }),
});
