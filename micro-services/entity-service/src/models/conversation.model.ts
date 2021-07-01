import { ConversationType } from "../enums/conversationType.enum";

export interface Conversation {
  id: string;
  type: ConversationType;
  teamId?: string;
}

export interface ChannelConversation extends Conversation {
  type: ConversationType.Channel;
  createdBy: string;
  name: string;
}

export interface DmConversation extends Conversation {
  type: ConversationType.DM;
}
