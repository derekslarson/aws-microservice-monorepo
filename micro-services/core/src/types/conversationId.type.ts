import { ConversationType } from "../enums/conversationType.enum";
import { FriendConvoId } from "./friendConvoId.type";
import { GroupId } from "./groupId.type";
import { MeetingId } from "./meetingId.type";

export type ConversationId<T extends ConversationType | void = void> =
  T extends ConversationType.Friend ? FriendConvoId :
    T extends ConversationType.Group ? GroupId :
      T extends ConversationType.Meeting ? MeetingId :
        FriendConvoId | GroupId | MeetingId;
