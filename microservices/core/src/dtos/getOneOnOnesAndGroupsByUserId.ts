import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetOneOnOnesAndGroupsByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({
    exclusiveStartKey: Optional(String),
    searchTerm: Optional(String),
    limit: Optional(Limit),
  }),
});
