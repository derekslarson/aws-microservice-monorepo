import { Optional, Record, String, Literal, Union } from "runtypes";
import { ConversationType } from "../runtypes/conversationType.runtype";
import { UserId } from "../runtypes/userId.runtype";
import { Limit } from "../runtypes/limit.runtype";

export const GetConversationsByUserIdDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({
    exclusiveStartKey: Optional(String),
    type: Optional(ConversationType),
    searchTerm: Optional(String),
    unread: Optional(Union(Literal("true"), Literal("false"))),
    limit: Optional(Limit),
  }),
});
