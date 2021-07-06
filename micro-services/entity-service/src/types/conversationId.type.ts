import { FriendConvoId } from "./friendConvoId.type";
import { GroupId } from "./groupId.type";
import { MeetingId } from "./meetingId.type";

export type ConversationId = FriendConvoId | GroupId | MeetingId;
