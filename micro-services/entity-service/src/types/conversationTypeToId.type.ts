import { ConversationType } from "../enums/conversationType.enum";
import { ConversationId } from "./conversationId.type";
import { FriendConvoId } from "./friendConvoId.type";
import { GroupId } from "./groupId.type";
import { MeetingId } from "./meetingId.type";

export type ConversationId<T extends ConversationType | void> =
  T extends ConversationType.Friend ? FriendConvoId :
    T extends ConversationType.Group ? GroupId :
      T extends ConversationType.Meeting ? MeetingId : FriendConvoId | GroupId | MeetingId;
