import { Record } from "runtypes";
import { MessageMimeType } from "../runtypes/message.mimeType.runtype";
import { OneOnOneId } from "../runtypes/oneOnOneId.runtype";

export const CreateOneOnOneMessageDto = Record({
  pathParameters: Record({ oneOnOneId: OneOnOneId }),
  body: Record({ mimeType: MessageMimeType }),
});
