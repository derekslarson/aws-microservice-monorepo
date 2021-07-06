import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetMeetingsByUserIdDto = Record({ pathParameters: Record({ userId: UserId }) });
