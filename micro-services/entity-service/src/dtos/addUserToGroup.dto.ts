import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { Role } from "../runtypes/role.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const AddUserToGroupDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  body: Record({
    userId: UserId,
    role: Role,
  }),
});
