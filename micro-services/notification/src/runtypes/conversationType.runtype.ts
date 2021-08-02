import { Literal, Union } from "runtypes";
import { ConversationFetchType } from "../enums/conversationFetchType.enum";

export const ConversationType = Union(Literal(ConversationFetchType.Friend), Literal(ConversationFetchType.Group), Literal(ConversationFetchType.Meeting), Literal(ConversationFetchType.MeetingDueDate));
