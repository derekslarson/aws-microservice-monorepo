import { GroupId } from "./groupId.type";
import { MeetingId } from "./meetingId.type";
import { OneOnOneId } from "./oneOnOneId.type";

export type ConversationId = GroupId | MeetingId | OneOnOneId;
