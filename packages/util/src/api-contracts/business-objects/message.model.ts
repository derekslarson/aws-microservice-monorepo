import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { ConversationType } from "../../enums/conversationType.enum";
import { MessageId } from "../../types/messageId.type";
import { UserId } from "../../types/userId.type";
import { Group } from "./group.model";
import { Meeting } from "./meeting.model";
import { User } from "./user.model";

export interface Message {
  id: MessageId;
  to: User | Group | Meeting;
  from: User;
  type: ConversationType;
  createdAt: string;
  seenAt: Record<UserId, string | null>;
  reactions: Record<string, UserId[]>;
  replyCount: number;
  mimeType: MessageMimeType;
  fetchUrl: string;
  transcript?: string;
  replyTo?: MessageId;
  agenda?: string;
  title?: string;
}
