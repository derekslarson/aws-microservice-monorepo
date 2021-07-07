import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const GetMessagesByUserAndFriendIdsDto = Record({
  pathParameters: Record({ userId: UserId, friendId: UserId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String) }),
});
