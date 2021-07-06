import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";

export const GetUsersByGroupIdDto = Record({ pathParameters: Record({ groupId: GroupId }) });
