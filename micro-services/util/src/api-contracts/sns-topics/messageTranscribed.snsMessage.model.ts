import { MessageId } from "../types/messageId.type";

export type MessageTranscribedSnsMessage = {
  messageId: MessageId;
  transcript: string;
};
