import { Record } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetConversationsByUserIdDto = Record({ pathParameters: Record({ userId: UserId }) });
