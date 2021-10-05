import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMessagesByUserIdAndSearchTermDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({ searchTerm: String, exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
