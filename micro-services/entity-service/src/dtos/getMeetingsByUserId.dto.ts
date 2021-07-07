import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetMeetingsByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String) }),
});
