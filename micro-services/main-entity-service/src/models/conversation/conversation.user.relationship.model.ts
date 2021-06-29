import { Role } from "@yac/core";

export interface ConversationUserRelationship {
  conversationId: string;
  userId: string;
  role: Role;
  muted: boolean;
  updatedAt: string;
  unreadMessages?: string[];
  recentMessageId?: string;
}
