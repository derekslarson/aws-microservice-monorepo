export interface Message {
  id: string;
  conversationId: string;
  from: string;
  transcript: string;
  sentAt: string;
  seenAt: { [key: string]: string | null };
  reactions: { [key: string]: number };
  hasReplies: boolean;
  replyTo?: string;
}
