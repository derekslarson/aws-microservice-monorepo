import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMessagesByUserAndFriendIdsDto = Record({
  pathParameters: Record({ userId: UserId, friendId: UserId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Limit }),
});
