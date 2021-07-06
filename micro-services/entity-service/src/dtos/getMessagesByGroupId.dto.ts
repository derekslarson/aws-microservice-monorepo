import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";

export const GetMessagesByByGroupIdDto = Record({ pathParameters: Record({ groupId: GroupId }) });
