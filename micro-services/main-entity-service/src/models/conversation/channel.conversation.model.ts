import { ConversationType } from "../../enums/conversationType.enum";
import { Conversation } from "./conversation.model";

export interface ChannelConversation extends Conversation {
  conversationType: ConversationType.Channel;
  createdBy: string;
  name: string;
}
