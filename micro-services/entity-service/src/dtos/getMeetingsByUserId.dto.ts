import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMeetingsByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Limit }),
});
