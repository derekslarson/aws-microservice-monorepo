import { Literal, Union } from "runtypes";
import { ConversationType as ConversationTypeEnum } from "../enums/conversationType.enum";

export const ConversationType = Union(Literal(ConversationTypeEnum.Friend), Literal(ConversationTypeEnum.Group), Literal(ConversationTypeEnum.Meeting));
