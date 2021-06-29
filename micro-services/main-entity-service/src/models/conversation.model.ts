import { ConversationType } from "../enums/conversationType.enum";

export interface Conversation {
  id: string;
  conversationType: ConversationType;
}

export interface ChannelConversation extends Conversation {
  conversationType: ConversationType.Channel;
  createdBy: string;
  name: string;
}

export interface DmConversation extends Conversation {
  conversationType: ConversationType.DM;
}
