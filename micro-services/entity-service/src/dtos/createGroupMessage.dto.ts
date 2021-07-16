import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { MimeType } from "../runtypes/mimeType.runtype";

export const CreateGroupMessageDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  body: Record({ mimeType: MimeType }),
});
