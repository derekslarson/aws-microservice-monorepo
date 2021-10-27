import { MessageId } from "../../types/messageId.type";
import { MessageMimeType } from "../../enums";

export type MessageTranscodedSnsMessage = {
  key: string;
  messageId: MessageId;
  newMimeType: MessageMimeType;
};
