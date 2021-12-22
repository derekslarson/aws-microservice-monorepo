import { Optional, Record, String, Literal, Union } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMeetingsByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({
    sortBy: Optional(Union(Literal("dueAt"), Literal("activeAt"))),
    searchTerm: Optional(String),
    exclusiveStartKey: Optional(String),
    limit: Optional(Limit),
  }),
});
