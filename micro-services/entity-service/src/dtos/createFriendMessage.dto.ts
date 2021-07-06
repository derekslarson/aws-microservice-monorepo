import { Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const CreateFriendMessageDto = Record({
  pathParameters: Record({ userId: UserId, friendId: UserId }),
  body: Record({ transcript: String }),
});
