import { Optional, Record, String } from "runtypes";
import { Limit } from "../runtypes/limit.runtype";
import { OneOnOneId } from "../runtypes/oneOnOneId.runtype";

export const GetMessagesByOneOnOneIdDto = Record({
  pathParameters: Record({ oneOnOneId: OneOnOneId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
