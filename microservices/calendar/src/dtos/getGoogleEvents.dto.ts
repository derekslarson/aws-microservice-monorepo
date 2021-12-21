import { Record, String, Optional } from "runtypes";
import { UserIdRuntype } from "@yac/util/src/runtypes/userId.runtype";
import { Limit } from "@yac/util/src/runtypes/limit.runtype";
import { DateRuntype } from "@yac/util/src/runtypes/date.runtype";

export const GetGoogleEventsDto = Record({
  pathParameters: Record({ userId: UserIdRuntype }),
  queryStringParameters: Record({
    exclusiveStartKey: Optional(String),
    limit: Optional(Limit),
    minTime: Optional(DateRuntype),
    maxTime: Optional(DateRuntype),
  }),
});
