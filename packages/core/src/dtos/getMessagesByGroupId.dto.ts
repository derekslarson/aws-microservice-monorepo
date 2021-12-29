import { Optional, Record, String } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetMessagesByGroupIdDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  queryStringParameters: Record({ searchTerm: Optional(String), exclusiveStartKey: Optional(String), limit: Optional(Limit) }),
});
