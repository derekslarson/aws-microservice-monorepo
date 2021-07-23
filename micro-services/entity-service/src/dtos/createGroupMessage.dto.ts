import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { MessageMimeType } from "../runtypes/mimeType.runtype";

export const CreateGroupMessageDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  body: Record({ mimeType: MessageMimeType }),
});
