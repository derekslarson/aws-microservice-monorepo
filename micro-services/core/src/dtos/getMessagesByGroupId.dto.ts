import { Optional, Record, String } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMessagesByByGroupIdDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
