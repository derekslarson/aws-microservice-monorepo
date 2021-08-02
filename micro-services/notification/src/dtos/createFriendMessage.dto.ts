import { Record } from "runtypes";
import { MessageMimeType } from "../runtypes/message.mimeType.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const CreateFriendMessageDto = Record({
  pathParameters: Record({ userId: UserId, friendId: UserId }),
  body: Record({ mimeType: MessageMimeType }),
});
