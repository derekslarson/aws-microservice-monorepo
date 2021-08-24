import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { MessageId } from "../types/messageId.type";
import { UserId } from "../types/userId.type";

export interface Message {
  id: MessageId;
  to: UserId | GroupId | MeetingId;
  from: UserId;
  type: "friend" | "group" | "meeting";
  createdAt: string;
  seenAt: Record<UserId, string | null>;
  reactions: Record<string, UserId[]>;
  replyCount: number;
  mimeType: "audio/mpeg" | "audio/mp4" | "video/mp4" | "video/webm";
  fetchUrl: string;
  fromImage: string;
  transcript?: string;
  replyTo?: MessageId;
}
