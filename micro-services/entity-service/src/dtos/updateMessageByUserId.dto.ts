import { Optional, Record, Boolean } from "runtypes";
import { MessageId } from "../runtypes/messageId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const UpdateMessageByUserIdDto = Record({
  pathParameters: Record({ userId: UserId, messageId: MessageId }),
  body: Record({ seen: Optional(Boolean) }),
});
