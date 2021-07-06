import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetUserDto = Record({ pathParameters: Record({ userId: UserId }) });
