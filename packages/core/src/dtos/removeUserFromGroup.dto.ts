import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const RemoveUserFromGroupDto = Record({ pathParameters: Record({ groupId: GroupId, userId: UserId }) });
