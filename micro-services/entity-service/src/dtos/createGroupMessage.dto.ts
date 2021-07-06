import { Record, String } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";

export const CreateGroupMessageDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  body: Record({ transcript: String }),
});
