import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetGroupsByUserIdDto = Record({ pathParameters: Record({ userId: UserId }) });
