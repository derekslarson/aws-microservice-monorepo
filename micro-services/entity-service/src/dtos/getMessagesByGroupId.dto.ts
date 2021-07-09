import { Optional, Record, String, Number } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";

export const GetMessagesByByGroupIdDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Number) }),
});
