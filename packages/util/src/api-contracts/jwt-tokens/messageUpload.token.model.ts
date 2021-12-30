import { MessageId } from "../../types/messageId.type";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { GroupId } from "../../types/groupId.type";
import { MeetingId } from "../../types/meetingId.type";
import { OneOnOneId } from "../../types/oneOnOneId.type";

export interface MessageUploadToken {
  conversationId: OneOnOneId | GroupId | MeetingId;
  messageId: MessageId;
  mimeType: MessageMimeType;
}
