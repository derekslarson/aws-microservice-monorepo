import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const RemoveUserAsFriendDto = Record({ pathParameters: Record({ userId: UserId, friendId: UserId }) });
