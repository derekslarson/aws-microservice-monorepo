import { Record, String } from "runtypes";
import { MessageId } from "../runtypes/messageId.runtype";

export const UpdateMessageDto = Record({
  pathParameters: Record({ messageId: MessageId }),
  body: Record({ transcript: String }),
});
