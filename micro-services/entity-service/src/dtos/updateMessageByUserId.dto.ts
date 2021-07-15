import { Optional, Record, Boolean, Array, String, Literal, Union } from "runtypes";
import { MessageId } from "../runtypes/messageId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const UpdateMessageByUserIdDto = Record({
  pathParameters: Record({ userId: UserId, messageId: MessageId }),
  body: Record({
    seen: Optional(Boolean),
    reactions: Optional(Array(Record({
      reaction: String,
      action: Union(Literal("add"), Literal("remove")),
    }))),
  }),
});
