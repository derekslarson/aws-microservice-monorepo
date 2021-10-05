import { MessageId } from "../../types/messageId.type";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { FriendConvoId } from "../../types/friendConvoId.type";
import { GroupId } from "../../types/groupId.type";
import { MeetingId } from "../../types/meetingId.type";

export interface MessageUploadToken {
  conversationId: FriendConvoId | GroupId | MeetingId;
  messageId: MessageId;
  mimeType: MessageMimeType;
}
