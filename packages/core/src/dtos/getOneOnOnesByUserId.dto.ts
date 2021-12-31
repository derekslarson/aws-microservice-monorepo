import { Optional, Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetOneOnOnesByuserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({ searchTerm: Optional(String), exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
