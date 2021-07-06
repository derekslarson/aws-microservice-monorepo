import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetFriendsByuserIdDto = Record({ pathParameters: Record({ userId: UserId }) });
