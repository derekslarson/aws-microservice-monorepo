import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";

export const GetGroupDto = Record({ pathParameters: Record({ groupId: GroupId }) });
