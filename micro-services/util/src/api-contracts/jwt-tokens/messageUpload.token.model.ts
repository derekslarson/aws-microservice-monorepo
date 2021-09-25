import { MessageId } from "../types/messageId.type";
import { MessageMimeType } from "../../enums/message.mimeType.enum";

export interface MessageUploadToken {
  messageId: MessageId;
  mimeType: MessageMimeType;
}
