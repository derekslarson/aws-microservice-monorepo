import { ConversationType } from "../../enums/conversationType.enum";
import { Conversation } from "./conversation.model";

export interface DmConversation extends Conversation {
  conversationType: ConversationType.DM;
}
