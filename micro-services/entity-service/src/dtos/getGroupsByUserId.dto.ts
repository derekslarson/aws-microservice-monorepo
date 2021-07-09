import { Optional, Record, String, Number } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetGroupsByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Number) }),
});
