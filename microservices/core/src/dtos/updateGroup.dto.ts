import { Record, String } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";

export const UpdateGroupDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  body: Record({ name: String }),
});
