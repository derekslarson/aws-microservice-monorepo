import { Optional, Record, Boolean } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const UpdateGroupMessagesByUserIdDto = Record({
  pathParameters: Record({ userId: UserId, groupId: GroupId }),
  body: Record({ seen: Optional(Boolean) }),
});
