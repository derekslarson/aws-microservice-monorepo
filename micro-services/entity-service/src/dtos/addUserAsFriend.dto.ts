import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const AddUserAsFriendDto = Record({
  pathParameters: Record({ userId: UserId }),
  body: Record({ friendId: UserId }),
});
