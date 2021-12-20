import { MessageId } from "../../types/messageId.type";
import { MessageMimeType } from "../../enums/message.mimeType.enum";

export type MessageTranscodedSnsMessage = {
  key: string;
  messageId: MessageId;
  newMimeType: MessageMimeType;
};
