import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const DeleteOneOnOneDto = Record({ pathParameters: Record({ userId: UserId, otherUserId: UserId }) });
