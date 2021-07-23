import { ConversationType as ConversationTypeEnum } from "../enums/conversationType.enum";
import { ConversationId } from "./conversationId.type";
import { FriendConvoId } from "./friendConvoId.type";
import { GroupId } from "./groupId.type";
import { MeetingId } from "./meetingId.type";

export type ConversationType<T extends ConversationId | void> =
  T extends FriendConvoId ? ConversationTypeEnum.Friend :
    T extends GroupId ? ConversationTypeEnum.Group :
      T extends MeetingId ? ConversationTypeEnum.Meeting : ConversationTypeEnum;
