import { Optional, Record, String, Boolean } from "runtypes";
import { ConversationType } from "../runtypes/conversationType.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const GetConversationsByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({
    exclusiveStartKey: Optional(String),
    type: Optional(ConversationType),
    unread: Optional(Boolean),
  }),
});
