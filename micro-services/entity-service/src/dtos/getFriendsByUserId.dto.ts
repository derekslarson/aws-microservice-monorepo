import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetFriendsByuserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Limit }),
});
